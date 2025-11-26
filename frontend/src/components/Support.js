import React, { useState } from 'react';
import './Support.css';

function Support() {
  const [expandedSection, setExpandedSection] = useState('overview');

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="support-container">
      <h2>Support & Documentation</h2>

      <div className="support-nav">
        <button onClick={() => toggleSection('overview')} className={expandedSection === 'overview' ? 'active' : ''}>
          Overview
        </button>
        <button onClick={() => toggleSection('setup')} className={expandedSection === 'setup' ? 'active' : ''}>
          AWS Setup Guide
        </button>
        <button onClick={() => toggleSection('faq')} className={expandedSection === 'faq' ? 'active' : ''}>
          FAQ
        </button>
        <button onClick={() => toggleSection('troubleshooting')} className={expandedSection === 'troubleshooting' ? 'active' : ''}>
          Troubleshooting
        </button>
      </div>

      {expandedSection === 'overview' && (
        <div className="support-section">
          <h3>IP Scanner Overview</h3>

          <div className="info-box">
            <h4>What is IP Scanner?</h4>
            <p>
              IP Scanner is a network monitoring tool that automatically scans IP addresses and subnets for open ports.
              It helps you keep track of which services are exposed on your network infrastructure.
            </p>
          </div>

          <div className="info-box">
            <h4>Key Features</h4>
            <ul>
              <li><strong>Target Management</strong>: Add individual IPs or entire CIDR subnets</li>
              <li><strong>Automated Scanning</strong>: Scans run every 15 minutes automatically</li>
              <li><strong>Port Detection</strong>: Checks 18 common ports including HTTP, HTTPS, SSH, FTP, and more</li>
              <li><strong>AWS Integration</strong>: Automatically import EC2 public IPs from your AWS account</li>
              <li><strong>Real-time Results</strong>: View scan results with auto-refresh</li>
            </ul>
          </div>

          <div className="info-box">
            <h4>Common Ports Scanned</h4>
            <div className="ports-grid">
              <div className="port-item"><strong>21</strong> - FTP</div>
              <div className="port-item"><strong>22</strong> - SSH</div>
              <div className="port-item"><strong>23</strong> - Telnet</div>
              <div className="port-item"><strong>25</strong> - SMTP</div>
              <div className="port-item"><strong>53</strong> - DNS</div>
              <div className="port-item"><strong>80</strong> - HTTP</div>
              <div className="port-item"><strong>110</strong> - POP3</div>
              <div className="port-item"><strong>143</strong> - IMAP</div>
              <div className="port-item"><strong>443</strong> - HTTPS</div>
              <div className="port-item"><strong>445</strong> - SMB</div>
              <div className="port-item"><strong>3306</strong> - MySQL</div>
              <div className="port-item"><strong>3389</strong> - RDP</div>
              <div className="port-item"><strong>5432</strong> - PostgreSQL</div>
              <div className="port-item"><strong>5900</strong> - VNC</div>
              <div className="port-item"><strong>6379</strong> - Redis</div>
              <div className="port-item"><strong>8080</strong> - HTTP Alt</div>
              <div className="port-item"><strong>8443</strong> - HTTPS Alt</div>
              <div className="port-item"><strong>27017</strong> - MongoDB</div>
            </div>
          </div>

          <div className="info-box">
            <h4>Quick Start</h4>
            <ol>
              <li>Go to the <strong>Manage Targets</strong> tab</li>
              <li>Add an IP address or CIDR subnet (e.g., 192.168.1.0/24)</li>
              <li>Wait for the next scan cycle (every 15 minutes) or restart the service</li>
              <li>View results in the <strong>Scan Results</strong> tab</li>
            </ol>
          </div>
        </div>
      )}

      {expandedSection === 'setup' && (
        <div className="support-section">
          <h3>AWS EC2 Integration Setup Guide</h3>

          <div className="warning-box">
            <strong>⏱️ Time Required:</strong> 5-10 minutes<br/>
            <strong>📋 Prerequisites:</strong> AWS account with permissions to create IAM users and policies
          </div>

          <div className="step-section">
            <h4>Step 1: Access IAM in AWS Console</h4>
            <ol>
              <li>Log in to your <a href="https://console.aws.amazon.com/" target="_blank" rel="noopener noreferrer">AWS Console</a></li>
              <li>In the search bar at the top, type "IAM" and select <strong>IAM (Identity and Access Management)</strong></li>
              <li>You should now be on the IAM Dashboard</li>
            </ol>
          </div>

          <div className="step-section">
            <h4>Step 2: Create a Custom Policy</h4>
            <ol>
              <li>In the left sidebar, click <strong>Policies</strong></li>
              <li>Click the <strong>Create policy</strong> button (blue button, top right)</li>
              <li>Click the <strong>JSON</strong> tab</li>
              <li>Delete any existing JSON and paste the following policy:</li>
            </ol>
            <pre className="code-block">{`{
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
}`}</pre>
            <ol start="5">
              <li>Click <strong>Next: Tags</strong> (you can skip adding tags)</li>
              <li>Click <strong>Next: Review</strong></li>
              <li>Enter a policy name: <code>IPScannerReadOnlyEC2</code></li>
              <li>Enter a description: <code>Read-only access to EC2 instances for IP Scanner application</code></li>
              <li>Click <strong>Create policy</strong></li>
            </ol>
            <div className="success-box">✅ Your policy is now created!</div>
          </div>

          <div className="step-section">
            <h4>Step 3: Create an IAM User</h4>
            <ol>
              <li>In the left sidebar, click <strong>Users</strong></li>
              <li>Click <strong>Add users</strong> (or <strong>Create user</strong>)</li>
              <li>Enter a user name: <code>ip-scanner-readonly</code></li>
              <li>Under "Select AWS credential type", choose <strong>Access key - Programmatic access</strong></li>
              <li className="warning-item">⚠️ Do NOT select "Password - AWS Management Console access" (not needed)</li>
              <li>Click <strong>Next: Permissions</strong></li>
            </ol>
          </div>

          <div className="step-section">
            <h4>Step 4: Attach the Policy to the User</h4>
            <ol>
              <li>Select <strong>Attach existing policies directly</strong></li>
              <li>In the search box, type: <code>IPScannerReadOnlyEC2</code></li>
              <li>Check the box next to your policy</li>
              <li>Click <strong>Next: Tags</strong> (you can skip adding tags)</li>
              <li>Click <strong>Next: Review</strong></li>
              <li>Review the user details and click <strong>Create user</strong></li>
            </ol>
          </div>

          <div className="step-section critical">
            <h4>Step 5: Save Your Credentials</h4>
            <div className="critical-box">
              ⚠️ <strong>CRITICAL:</strong> This is the ONLY time you'll see the Secret Access Key!
            </div>
            <ol>
              <li>You'll see a success page with:
                <ul>
                  <li><strong>Access key ID</strong>: Looks like <code>AKIAIOSFODNN7EXAMPLE</code></li>
                  <li><strong>Secret access key</strong>: Click "Show" to reveal it</li>
                </ul>
              </li>
              <li><strong>SAVE THESE CREDENTIALS NOW</strong> - Options:
                <ul>
                  <li>Click <strong>Download .csv</strong> (recommended - saves both keys to a file)</li>
                  <li>Copy both keys to a secure password manager</li>
                  <li>Write them down in a secure location</li>
                </ul>
              </li>
              <li className="warning-item">⚠️ Do NOT share these credentials or commit them to git</li>
              <li>Click <strong>Close</strong> when done</li>
            </ol>
          </div>

          <div className="step-section">
            <h4>Step 6: Enter Credentials in IP Scanner</h4>
            <ol>
              <li>Click the <strong>⚙️ Settings</strong> tab in this application</li>
              <li>Scroll to <strong>AWS Integration</strong> section</li>
              <li>Enter the credentials:
                <ul>
                  <li><strong>AWS Access Key ID</strong>: Paste your Access key ID</li>
                  <li><strong>AWS Secret Access Key</strong>: Paste your Secret access key</li>
                  <li><strong>AWS Region</strong>: Select your region (e.g., us-east-1)</li>
                </ul>
              </li>
              <li>Click <strong>Save Credentials</strong></li>
              <li>You should see a green success message: "✓ AWS credentials configured"</li>
            </ol>
          </div>

          <div className="step-section">
            <h4>Step 7: Test the Integration</h4>
            <ol>
              <li>Go to the <strong>🎯 Manage Targets</strong> tab</li>
              <li>Click <strong>☁️ Sync from AWS EC2</strong> button</li>
              <li>Wait a few seconds</li>
              <li>You should see a success message showing how many IPs were added</li>
              <li>The public IPs from your EC2 instances should now appear in the target list</li>
            </ol>
            <div className="success-box">✅ Setup complete! Your IP Scanner can now automatically sync EC2 public IPs.</div>
          </div>

          <div className="info-box">
            <h4>Security Notes</h4>
            <ul>
              <li>This IAM user can <strong>ONLY</strong> read EC2 instance information</li>
              <li>It <strong>CANNOT</strong> start, stop, terminate, or modify instances</li>
              <li>It <strong>CANNOT</strong> access other AWS services</li>
              <li>Credentials are stored in your local database</li>
              <li>AWS recommends rotating access keys every 90 days</li>
            </ul>
          </div>
        </div>
      )}

      {expandedSection === 'faq' && (
        <div className="support-section">
          <h3>Frequently Asked Questions</h3>

          <div className="faq-item">
            <h4>General Questions</h4>

            <div className="faq-question">
              <strong>Q: How often does the scanner run?</strong>
              <p>A: The scanner runs automatically every 15 minutes. It scans all enabled targets in your list.</p>
            </div>

            <div className="faq-question">
              <strong>Q: Can I add a single IP address or do I need to use CIDR notation?</strong>
              <p>A: You can add both! Single IPs (like 192.168.1.1) and CIDR subnets (like 192.168.1.0/24) are supported.</p>
            </div>

            <div className="faq-question">
              <strong>Q: Will this cost me money on AWS?</strong>
              <p>A: No. IAM users and policies are free. The ec2:DescribeInstances API call is also free. You're only charged for your actual EC2 instances.</p>
            </div>

            <div className="faq-question">
              <strong>Q: How often does IP Scanner call the AWS API?</strong>
              <p>A: Only when you click the "Sync from AWS EC2" button. It does NOT automatically sync. You have full control.</p>
            </div>
          </div>

          <div className="faq-item">
            <h4>AWS Integration</h4>

            <div className="faq-question">
              <strong>Q: Which AWS region should I select?</strong>
              <p>A: Select the region where most of your EC2 instances are running. Common choices:</p>
              <ul>
                <li>us-east-1 - US East (N. Virginia) - Most common default</li>
                <li>us-west-2 - US West (Oregon)</li>
                <li>eu-west-1 - EU (Ireland)</li>
              </ul>
              <p>To find your instances' region, check the region dropdown in the AWS Console EC2 dashboard.</p>
            </div>

            <div className="faq-question">
              <strong>Q: Can I scan multiple AWS regions?</strong>
              <p>A: Yes! Change the region in Settings and sync again for each region. All IPs will be added to your target list.</p>
            </div>

            <div className="faq-question">
              <strong>Q: I closed the AWS window before saving my Secret Access Key. What do I do?</strong>
              <p>A: Unfortunately, AWS only shows it once. You need to create a new access key:</p>
              <ol>
                <li>Go to IAM → Users → ip-scanner-readonly → Security credentials</li>
                <li>Click "Create access key"</li>
                <li>Save the new credentials</li>
                <li>Delete the old access key you didn't save</li>
              </ol>
            </div>

            <div className="faq-question">
              <strong>Q: Can this IAM user start, stop, or terminate my EC2 instances?</strong>
              <p>A: <strong>No.</strong> The policy only grants read-only access. The user cannot:</p>
              <ul>
                <li>Start, stop, reboot, or terminate instances</li>
                <li>Create new instances</li>
                <li>Modify security groups or settings</li>
                <li>Access other AWS services</li>
              </ul>
            </div>
          </div>

          <div className="faq-item">
            <h4>Troubleshooting</h4>

            <div className="faq-question">
              <strong>Q: Sync returns "0 added" but I have EC2 instances. Why?</strong>
              <p>A: Possible reasons:</p>
              <ul>
                <li><strong>Wrong region</strong>: Your instances are in a different region</li>
                <li><strong>No public IPs</strong>: Only instances with public IPs are synced</li>
                <li><strong>Instances stopped</strong>: Only "running" instances are included</li>
                <li><strong>Already added</strong>: IPs already in your target list are skipped</li>
              </ul>
            </div>

            <div className="faq-question">
              <strong>Q: I'm getting "Access Denied" when trying to sync. What's wrong?</strong>
              <p>A: Common causes:</p>
              <ul>
                <li>Wrong credentials - double-check you copied them correctly</li>
                <li>Policy not attached - verify in IAM → Users → Permissions</li>
                <li>Typo in policy - re-create using the exact JSON from the setup guide</li>
                <li>Wrong region - ensure you have instances in the selected region</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {expandedSection === 'troubleshooting' && (
        <div className="support-section">
          <h3>Troubleshooting Guide</h3>

          <div className="troubleshoot-section">
            <h4>Application Issues</h4>

            <div className="issue-box">
              <strong>Issue: Can't add a target - "Failed to create target" error</strong>
              <p><strong>Solution:</strong></p>
              <ul>
                <li>Verify the IP address or CIDR notation is valid (e.g., 192.168.1.1 or 192.168.1.0/24)</li>
                <li>Check that the target doesn't already exist in your list</li>
                <li>Ensure the API service is running (check Docker containers)</li>
              </ul>
            </div>

            <div className="issue-box">
              <strong>Issue: Scan results not updating</strong>
              <p><strong>Solution:</strong></p>
              <ul>
                <li>Results update every 15 minutes - wait for the next scan cycle</li>
                <li>Check that targets are enabled (green checkmark in target list)</li>
                <li>Verify Docker containers are running: <code>docker compose ps</code></li>
                <li>Check API logs: <code>docker compose logs api</code></li>
              </ul>
            </div>
          </div>

          <div className="troubleshoot-section">
            <h4>AWS Integration Issues</h4>

            <div className="issue-box">
              <strong>Issue: "AWS credentials not configured" error</strong>
              <p><strong>Solution:</strong></p>
              <ul>
                <li>Go to Settings tab and configure AWS credentials</li>
                <li>Ensure you've saved the credentials (look for green success message)</li>
                <li>Refresh the page and try again</li>
              </ul>
            </div>

            <div className="issue-box">
              <strong>Issue: "Failed to sync AWS EC2 instances" error</strong>
              <p><strong>Solution:</strong></p>
              <ul>
                <li>Verify credentials are correct in Settings</li>
                <li>Check AWS IAM policy is attached to the user</li>
                <li>Ensure you have internet connectivity</li>
                <li>Try a different AWS region</li>
                <li>Open browser console (F12) for detailed error messages</li>
              </ul>
            </div>

            <div className="issue-box">
              <strong>Issue: Can't find IAM in AWS Console</strong>
              <p><strong>Solution:</strong></p>
              <ul>
                <li>Use the search bar at the top of AWS Console</li>
                <li>Type "IAM" and select it from the dropdown</li>
                <li>You may need IAM permissions from your AWS administrator</li>
              </ul>
            </div>
          </div>

          <div className="troubleshoot-section">
            <h4>Docker Issues</h4>

            <div className="issue-box">
              <strong>Issue: Services not starting</strong>
              <p><strong>Solution:</strong></p>
              <ul>
                <li>Check all containers are running: <code>docker compose ps</code></li>
                <li>Restart services: <code>docker compose restart</code></li>
                <li>Check logs: <code>docker compose logs</code></li>
                <li>Rebuild if needed: <code>docker compose up --build</code></li>
              </ul>
            </div>
          </div>

          <div className="help-box">
            <h4>Still Need Help?</h4>
            <p>If you're still experiencing issues:</p>
            <ol>
              <li>Check the browser console (F12 → Console tab) for error messages</li>
              <li>Check Docker logs: <code>docker compose logs</code></li>
              <li>Verify all containers are healthy: <code>docker compose ps</code></li>
              <li>Review the detailed AWS IAM Policy documentation in the project repository</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}

export default Support;
