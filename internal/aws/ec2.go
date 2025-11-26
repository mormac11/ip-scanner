package aws

import (
	"context"
	"fmt"

	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/ec2"
)

type EC2Service struct {
	client *ec2.Client
}

// NewEC2Service creates a new EC2 service with AWS SDK default configuration
func NewEC2Service(ctx context.Context) (*EC2Service, error) {
	cfg, err := config.LoadDefaultConfig(ctx)
	if err != nil {
		return nil, fmt.Errorf("unable to load SDK config: %w", err)
	}

	return &EC2Service{
		client: ec2.NewFromConfig(cfg),
	}, nil
}

// NewEC2ServiceWithCredentials creates a new EC2 service with explicit credentials
func NewEC2ServiceWithCredentials(ctx context.Context, accessKeyID, secretAccessKey, region string) (*EC2Service, error) {
	cfg, err := config.LoadDefaultConfig(ctx,
		config.WithRegion(region),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(
			accessKeyID,
			secretAccessKey,
			"",
		)),
	)
	if err != nil {
		return nil, fmt.Errorf("unable to load SDK config: %w", err)
	}

	return &EC2Service{
		client: ec2.NewFromConfig(cfg),
	}, nil
}

// GetPublicIPs fetches all public IP addresses from EC2 instances in the current region
func (s *EC2Service) GetPublicIPs(ctx context.Context) ([]string, error) {
	input := &ec2.DescribeInstancesInput{}

	result, err := s.client.DescribeInstances(ctx, input)
	if err != nil {
		return nil, fmt.Errorf("failed to describe instances: %w", err)
	}

	var publicIPs []string
	for _, reservation := range result.Reservations {
		for _, instance := range reservation.Instances {
			// Only include running instances with public IPs
			if instance.State != nil && instance.State.Name == "running" {
				if instance.PublicIpAddress != nil && *instance.PublicIpAddress != "" {
					publicIPs = append(publicIPs, *instance.PublicIpAddress)
				}
			}
		}
	}

	return publicIPs, nil
}
