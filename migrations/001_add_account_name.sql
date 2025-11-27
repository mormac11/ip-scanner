-- Migration: Add account_name to aws_credentials table
-- This allows storing multiple AWS accounts

ALTER TABLE aws_credentials
ADD COLUMN IF NOT EXISTS account_name VARCHAR(255) NOT NULL DEFAULT 'default';

-- Add unique constraint on account_name
ALTER TABLE aws_credentials
ADD CONSTRAINT aws_credentials_account_name_unique UNIQUE (account_name);

-- Update existing row to have a proper name
UPDATE aws_credentials SET account_name = 'default' WHERE account_name = 'default';
