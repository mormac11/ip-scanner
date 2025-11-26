# AWS IAM Policy for IP Scanner

This document provides a comprehensive guide for setting up AWS access for the IP Scanner application to fetch public IP addresses from your EC2 instances.

## Table of Contents
- [Overview](#overview)
- [Step-by-Step Setup Guide](#step-by-step-setup-guide)
- [IAM Policy](#iam-policy-read-only-ec2-access)
- [Frequently Asked Questions (FAQ)](#frequently-asked-questions-faq)
- [Security Best Practices](#security-best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

The IP Scanner needs read-only access to EC2 instances to fetch public IP addresses. This is accomplished using a dedicated IAM user with limited permissions that can only view EC2 instance information.

**What you'll need:**
- AWS account with permissions to create IAM users and policies
- About 5-10 minutes to complete setup
- Access to the AWS Console

---

## Step-by-Step Setup Guide

### Step 1: Access IAM in AWS Console

1. Log in to your [AWS Console](https://console.aws.amazon.com/)
2. In the search bar at the top, type "IAM" and select **IAM (Identity and Access Management)**
3. You should now be on the IAM Dashboard

### Step 2: Create a Custom Policy

Before creating the user, we'll create a custom policy with minimal permissions.

1. In the left sidebar, click **Policies**
2. Click the **Create policy** button (blue button, top right)
3. You'll see two tabs: "Visual editor" and "JSON"
4. Click the **JSON** tab
5. Delete any existing JSON and paste the following policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ReadOnlyEC2Instances",
      "Effect": "Allow",
      "Action": [
        "ec2:DescribeInstances"
      ],
      "Resource": "*"
    }
  ]
}
```

6. Click **Next: Tags** (you can skip adding tags)
7. Click **Next: Review**
8. Enter a policy name: `IPScannerReadOnlyEC2`
9. Enter a description: `Read-only access to EC2 instances for IP Scanner application`
10. Click **Create policy**

✅ Your policy is now created!

### Step 3: Create an IAM User

1. In the left sidebar, click **Users**
2. Click **Add users** (or **Create user** depending on your AWS Console version)
3. Enter a user name: `ip-scanner-readonly`
4. Under "Select AWS credential type", choose **Access key - Programmatic access**
   - ⚠️ Do NOT select "Password - AWS Management Console access" (not needed)
5. Click **Next: Permissions**

### Step 4: Attach the Policy to the User

1. Select **Attach existing policies directly**
2. In the search box, type: `IPScannerReadOnlyEC2`
3. Check the box next to your policy
4. Click **Next: Tags** (you can skip adding tags)
5. Click **Next: Review**
6. Review the user details:
   - User name: `ip-scanner-readonly`
   - AWS credential type: Programmatic access
   - Permissions: IPScannerReadOnlyEC2
7. Click **Create user**

### Step 5: Save Your Credentials

**⚠️ CRITICAL: This is the ONLY time you'll see the Secret Access Key!**

1. You'll see a success page with:
   - **Access key ID**: Looks like `AKIAIOSFODNN7EXAMPLE`
   - **Secret access key**: Click "Show" to reveal it
2. **SAVE THESE CREDENTIALS NOW** - Options:
   - Click **Download .csv** (recommended - saves both keys to a file)
   - Copy both keys to a secure password manager
   - Write them down in a secure location
3. ⚠️ Do NOT share these credentials or commit them to git
4. Click **Close** when done

### Step 6: Enter Credentials in IP Scanner

1. Open IP Scanner: http://localhost:3000
2. Click the **⚙️ Settings** tab
3. Scroll to **AWS Integration** section
4. Enter the credentials:
   - **AWS Access Key ID**: Paste your Access key ID
   - **AWS Secret Access Key**: Paste your Secret access key
   - **AWS Region**: Select the region where your EC2 instances are located (e.g., `us-east-1`)
5. Click **Save Credentials**
6. You should see a green success message: "✓ AWS credentials configured"

### Step 7: Test the Integration

1. Go to the **🎯 Manage Targets** tab
2. Click **☁️ Sync from AWS EC2** button
3. Wait a few seconds
4. You should see a success message showing how many IPs were added
5. The public IPs from your EC2 instances should now appear in the target list

✅ Setup complete! Your IP Scanner can now automatically sync EC2 public IPs.

---

## IAM Policy (Read-Only EC2 Access)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ReadOnlyEC2Instances",
      "Effect": "Allow",
      "Action": [
        "ec2:DescribeInstances"
      ],
      "Resource": "*"
    }
  ]
}
```

### Policy Explanation

- **Action**: `ec2:DescribeInstances`
  - This is the ONLY permission granted
  - Allows reading EC2 instance information including public IP addresses
  - Does NOT allow:
    - Creating, modifying, or deleting instances
    - Starting or stopping instances
    - Accessing any other AWS services
    - Modifying security groups, VPCs, or network settings

- **Resource**: `*`
  - Applies to all EC2 instances in the account
  - Can be restricted to specific regions or instance tags if needed

- **Effect**: `Allow`
  - Grants the specified permission

## Security Best Practices

1. **Use Dedicated IAM User**
   - Create a separate IAM user specifically for this application
   - Don't use your root account or personal admin credentials

2. **Least Privilege**
   - This policy grants the minimum permissions needed
   - Only allows reading instance information

3. **Credential Rotation**
   - Periodically rotate the access keys
   - AWS recommends rotating credentials every 90 days

4. **Monitor Usage**
   - Use CloudTrail to monitor API calls made by this user
   - Set up CloudWatch alarms for unusual activity

5. **Restrict by Region (Optional)**
   - If you only need to scan instances in specific regions, you can add a condition:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "ReadOnlyEC2InstancesInRegion",
         "Effect": "Allow",
         "Action": [
           "ec2:DescribeInstances"
         ],
         "Resource": "*",
         "Condition": {
           "StringEquals": {
             "aws:RequestedRegion": ["us-east-1", "us-west-2"]
           }
         }
       }
     ]
   }
   ```

6. **Restrict by Tag (Optional)**
   - To only fetch instances with specific tags:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "ReadOnlyTaggedEC2Instances",
         "Effect": "Allow",
         "Action": [
           "ec2:DescribeInstances"
         ],
         "Resource": "*",
         "Condition": {
           "StringEquals": {
             "ec2:ResourceTag/Scan": "true"
           }
         }
       }
     ]
   }
   ```

## What Data is Accessed

The `ec2:DescribeInstances` permission allows the application to read:
- Instance ID
- Instance state (running, stopped, etc.)
- **Public IP addresses** (this is what we need)
- Private IP addresses
- Instance type
- Launch time
- Tags
- VPC and subnet information

The application specifically extracts:
- Public IP addresses from instances in "running" state
- No other data is stored or used

## Entering Credentials in IP Scanner

1. Open the IP Scanner web interface (http://localhost:3000)
2. Go to the "Manage Targets" tab
3. Find the "AWS Integration" section
4. Click on "AWS Credentials" form
5. Enter:
   - **AWS Access Key ID**: Your IAM user's access key
   - **AWS Secret Access Key**: Your IAM user's secret key
   - **AWS Region**: The region where your EC2 instances are located

6. Click "Save Credentials"

The credentials are stored encrypted in the application's database and are only used to fetch EC2 instance information.

## Troubleshooting

### "Access Denied" Error
- Verify the IAM policy is correctly attached to the user
- Check that the access key and secret key are correct
- Ensure the region is set correctly

### No Instances Found
- Verify you have running EC2 instances in the selected region
- Check that the instances have public IP addresses assigned
- Ensure the instance state is "running" (stopped instances are not included)

### Invalid Credentials
- Double-check the access key ID and secret access key
- Verify the IAM user exists and is active
- Check that programmatic access is enabled for the user

---

## Frequently Asked Questions (FAQ)

### General Questions

**Q: Why do I need to create a separate IAM user? Can't I use my main AWS credentials?**

A: **Never use your main AWS credentials** for applications. Creating a separate IAM user with limited permissions follows the principle of least privilege. If these credentials are compromised, the attacker can only read EC2 instance information, not delete resources, incur charges, or access other AWS services.

**Q: Will this cost me money?**

A: No. IAM users and policies are free. The `ec2:DescribeInstances` API call is also free and does not incur charges. You're only charged for your actual EC2 instances.

**Q: How often does the IP Scanner call the AWS API?**

A: The IP Scanner only calls the AWS API when you click the "Sync from AWS EC2" button. It does NOT automatically or periodically sync. You have full control over when API calls are made.

**Q: Does this work with EC2 instances in all regions?**

A: The credentials work for all regions where you have EC2 instances. However, when you configure the credentials in IP Scanner, you select one region. The sync will only fetch instances from that selected region. If you have instances in multiple regions, you can:
- Change the region in Settings and sync again
- Create multiple scans (one per region)

**Q: What if I don't have any EC2 instances?**

A: If you don't have EC2 instances, or none with public IPs, the sync will return "0 added" and that's normal. This feature is optional - you can still add IP addresses manually.

### Setup Questions

**Q: I can't find IAM in the AWS Console. Where is it?**

A: Use the search bar at the very top of the AWS Console. Type "IAM" and it should appear in the dropdown. You may need permissions from your AWS administrator to access IAM.

**Q: Do I need to be an AWS administrator to set this up?**

A: You need permission to:
- Create IAM policies
- Create IAM users
- Attach policies to users

If you don't have these permissions, ask your AWS administrator to either:
- Grant you IAM permissions, or
- Create the user and policy for you following this guide

**Q: The policy creation failed with "Invalid JSON". What's wrong?**

A: Make sure you:
1. Click the "JSON" tab (not Visual editor)
2. Delete ALL existing JSON before pasting
3. Copy the exact policy from this document
4. Don't add or remove any quotes, commas, or brackets

**Q: I created the user but can't find my policy when attaching it.**

A: After creating the policy, it may take a few seconds to appear. Try:
1. Refreshing the page
2. Using the search box - type the exact policy name: `IPScannerReadOnlyEC2`
3. Make sure you're on the "Attach existing policies directly" tab

**Q: I closed the window before saving my Secret Access Key. What do I do?**

A: Unfortunately, AWS only shows the Secret Access Key once. You have two options:
1. **Create a new access key** for the same user (recommended):
   - Go to IAM → Users → `ip-scanner-readonly` → Security credentials
   - Click "Create access key"
   - Save the new credentials
   - Delete the old access key you didn't save
2. **Create a new user** (if you prefer a clean start)

### Region Questions

**Q: Which region should I select?**

A: Select the region where most of your EC2 instances are running. Common choices:
- `us-east-1` - US East (N. Virginia) - Most common default region
- `us-west-2` - US West (Oregon)
- `eu-west-1` - EU (Ireland)

To find where your instances are, log into AWS Console → EC2 → Check the region dropdown in the top right.

**Q: Can I scan multiple regions?**

A: Yes, but you'll need to do it in separate sync operations:
1. Set region to `us-east-1` in Settings
2. Click "Sync from AWS EC2" on Targets page
3. Change region to `us-west-2` in Settings
4. Click "Sync from AWS EC2" again
5. Repeat for each region

All IPs will be added to your target list, regardless of which region they came from.

**Q: Do I need different credentials for different regions?**

A: No! The same credentials work for all regions. You only need one IAM user, but you change the region setting when syncing.

### Permissions and Security Questions

**Q: Can this IAM user start, stop, or terminate my EC2 instances?**

A: **No.** The policy only grants `ec2:DescribeInstances` permission, which is read-only. The user cannot:
- Start, stop, reboot, or terminate instances
- Create new instances
- Modify security groups
- Change any settings
- Access other AWS services (S3, RDS, Lambda, etc.)

**Q: Can this user see my EC2 instance names and tags?**

A: Yes. The `ec2:DescribeInstances` permission provides read access to all instance metadata including:
- Instance IDs
- Instance state (running, stopped, etc.)
- Public and private IP addresses
- Instance type
- Tags
- VPC and subnet information
- Security groups

However, it does NOT provide access to:
- Data on the instances
- SSH keys
- Instance passwords
- Application data

**Q: What happens if my Access Key is exposed or leaked?**

A: If you suspect your credentials are compromised:
1. **Immediately deactivate the access key**:
   - AWS Console → IAM → Users → `ip-scanner-readonly` → Security credentials
   - Find the access key → Click "Make inactive"
2. **Delete the access key** (after deactivating)
3. **Create a new access key**
4. **Update credentials in IP Scanner Settings**
5. **Review CloudTrail logs** to see if the credentials were misused

**Q: Should I rotate these credentials?**

A: Yes, AWS recommends rotating access keys every 90 days. To rotate:
1. Create a new access key for the user
2. Update IP Scanner Settings with new credentials
3. Test that sync works
4. Delete the old access key

**Q: Is it safe to store credentials in the IP Scanner database?**

A: The credentials are stored in the PostgreSQL database. For production use, you should:
- Use strong database passwords
- Restrict database access to localhost only
- Consider encrypting credentials at rest (future enhancement)
- Run the database in a secure network
- Keep database backups secure

For maximum security in production, consider using AWS IAM roles instead of access keys (requires running IP Scanner on AWS EC2).

### Troubleshooting Questions

**Q: I'm getting "Access Denied" when trying to sync. What's wrong?**

A: Common causes:
1. **Wrong credentials**: Double-check you copied the full Access Key ID and Secret Access Key
2. **Policy not attached**: Verify the policy is attached to the user (IAM → Users → `ip-scanner-readonly` → Permissions)
3. **Typo in policy**: Re-create the policy using the exact JSON from this guide
4. **Wrong region**: Make sure you have EC2 instances in the selected region

**Q: Sync returns "0 added" but I have EC2 instances. Why?**

A: Possible reasons:
1. **Wrong region selected**: Your instances are in a different region than what you selected in Settings
2. **Instances don't have public IPs**: Only instances with public IP addresses are synced
3. **Instances are stopped**: Only "running" instances are included
4. **Already added**: IPs that already exist in your targets list are skipped

**Q: Error: "Failed to sync AWS EC2 instances". What does this mean?**

A: This generic error can mean:
- Invalid credentials
- Network connectivity issue
- AWS API temporarily unavailable
- Policy is missing or incorrectly configured

Check the browser console (F12 → Console tab) for more detailed error messages.

**Q: Can I test if my credentials work before using IP Scanner?**

A: Yes! You can use AWS CLI to test:
```bash
# Configure AWS CLI with your credentials
aws configure

# Test the credentials
aws ec2 describe-instances --region us-east-1
```

If this works, your credentials are valid.

### Advanced Questions

**Q: Can I restrict this to only scan certain EC2 instances (by tag)?**

A: Yes! Modify the IAM policy to add a condition. For example, to only allow instances tagged with `Scan=true`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ReadOnlyTaggedEC2Instances",
      "Effect": "Allow",
      "Action": [
        "ec2:DescribeInstances"
      ],
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "ec2:ResourceTag/Scan": "true"
        }
      }
    }
  ]
}
```

**Note**: This will filter at the policy level, but the IP Scanner application doesn't currently have tag-based filtering. You'll need to manually remove unwanted IPs from the target list.

**Q: Can I use an IAM role instead of an IAM user?**

A: Yes, if your IP Scanner is running on an AWS EC2 instance, you can use an IAM role instead:
1. Create an IAM role with the same policy
2. Attach the role to your EC2 instance
3. The AWS SDK will automatically use the role credentials
4. You don't need to configure credentials in IP Scanner Settings

This is more secure than access keys but only works when running on AWS.

**Q: Can I give this user permission to fetch IPs from other AWS services (ECS, RDS, etc.)?**

A: The current version only supports EC2 instances. However, you could extend it by:
1. Modifying the IAM policy to include other services (e.g., `ecs:DescribeTasks`, `rds:DescribeDBInstances`)
2. Updating the Go backend to fetch IPs from those services
3. This would require custom development

---

## Revoking Access

If you need to revoke access:

### Option 1: Deactivate Access Keys (Temporary)
1. AWS Console → IAM → Users → `ip-scanner-readonly` → Security credentials
2. Find the access key → Click "Actions" → "Deactivate"
3. The credentials will stop working immediately
4. You can reactivate later if needed

### Option 2: Delete Access Keys (Permanent)
1. AWS Console → IAM → Users → `ip-scanner-readonly` → Security credentials
2. Find the access key → Click "Actions" → "Delete"
3. Confirm deletion
4. The credentials are permanently deleted

### Option 3: Delete the IAM User (Complete Removal)
1. AWS Console → IAM → Users
2. Select `ip-scanner-readonly`
3. Click "Delete user"
4. Confirm deletion
5. All access keys and permissions are removed

### Don't Forget to Clean Up IP Scanner
After revoking AWS access, also delete credentials from IP Scanner:
1. Open IP Scanner → Settings tab
2. Click "Delete" button in AWS Credentials section
3. This removes credentials from the database
