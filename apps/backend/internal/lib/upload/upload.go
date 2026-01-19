package upload

import (
	"context"
	"crypto/rand"
	"fmt"
	"io"
	"math/big"

	// "net/http"
	"path"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

type Client struct {
	s3Client   *s3.Client
	bucketName string
	publicURL  string
}

// NewClient initializes the R2/S3 connection
func NewClient(ctx context.Context, endpoint, accessKey, secretKey, bucketName, publicURL string) (*Client, error) {
	cfg, err := config.LoadDefaultConfig(ctx,
		config.WithBaseEndpoint(endpoint),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(accessKey, secretKey, "")),
		config.WithRegion("auto"), // R2 uses 'auto'
	)
	if err != nil {
		return nil, err
	}

	return &Client{
		s3Client:   s3.NewFromConfig(cfg),
		bucketName: bucketName,
		publicURL:  strings.TrimRight(publicURL, "/"), // Ensure no trailing slash
	}, nil
}

type UploadParams struct {
	File        io.Reader // The raw stream (works for multipart, os.File, bytes.Buffer)
	Folder      string    // e.g., "projects/thumbnails" or "certificates/2024"
	Filename    string    // e.g., "uuid.jpg"
	UserID      string    // User ID for filename generation
	ContentType string    // e.g., "image/png" or "application/pdf"
	Size        int64     // Needed for progress tracking and performance
}

// Upload streams the file to the bucket and returns the Viewable Public URL
func (c *Client) Upload(ctx context.Context, params UploadParams) (string, error) {
	// 1. Generate new filename: datetime-user_id-random_6_numbers
	ext := path.Ext(params.Filename)
	timestamp := time.Now().Format("20060102150405")

	randNumBig, err := rand.Int(rand.Reader, big.NewInt(1000000))
	if err != nil {
		return "", fmt.Errorf("failed to generate random number: %w", err)
	}

	newFilename := fmt.Sprintf("%s-%s-%06d%s", timestamp, params.UserID, randNumBig, ext)

	// 2. Smart Path Joining: Prevents double slashes (projects//image.jpg)
	key := path.Join(params.Folder, newFilename)

	// 3. Auto-Detect Content Type if missing (Optional safeguard)
	if params.ContentType == "" {
		// Read first 512 bytes to sniff content type (requires a generic helper,
		// simpler to just require it from the handler for now to avoid stream consumption issues)
		params.ContentType = "application/octet-stream"
	}

	// 4. Stream to S3/R2
	_, err = c.s3Client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:        aws.String(c.bucketName),
		Key:           aws.String(key),
		Body:          params.File,
		ContentType:   aws.String(params.ContentType),
		ContentLength: aws.Int64(params.Size),
		// ACL is usually not needed for R2 if "Public Access" is enabled on the bucket,
		// but if using standard S3, you might need: ACL: types.ObjectCannedACLPublicRead,
	})
	if err != nil {
		return "", fmt.Errorf("failed to upload to storage: %w", err)
	}
	return fmt.Sprintf("%s/%s", c.publicURL, key), nil
}

// Delete removes an object from the bucket by its key
func (c *Client) Delete(ctx context.Context, key string) error {
	_, err := c.s3Client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(c.bucketName),
		Key:    aws.String(key),
	})
	if err != nil {
		return fmt.Errorf("failed to delete object: %w", err)
	}

	return nil
}

// func (s *ProjectService) UploadProjectImage(ctx context.Context, file multipart.File, header *multipart.FileHeader) (string, error) {
//     // 1. Generate clean filename
//     ext := filepath.Ext(header.Filename)
//     filename := uuid.NewString() + ext

//     // 2. Call the abstraction
//     // Notice how we just say "put this in the projects folder"
//     url, err := s.storage.Upload(ctx, storage.UploadParams{
//         File:        file,
//         Folder:      "projects", // <--- Organized storage
//         Filename:    filename,
//         ContentType: header.Header.Get("Content-Type"),
//         Size:        header.Size,
//     })

//     return url, err
// }