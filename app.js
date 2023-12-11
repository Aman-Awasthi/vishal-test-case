const express = require('express');
const multer = require('multer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { fromCognitoIdentityPool } = require('@aws-sdk/credential-provider-cognito-identity');

const fs = require('fs');
const config = require('./config.json'); // Load configuration

const app = express();
const port = 3000;

// Configure AWS SDK v3 with your credentials and S3 bucket details
const s3 = new S3Client({
  region: config.aws.region,
  credentials: {
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
  },
});

// Multer middleware for handling file uploads
const upload = multer({ dest: 'uploads/' });

// Serve HTML page
app.use(express.static(__dirname));
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// Handle file upload
app.post('/upload', upload.single('video'), async (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).send('No file uploaded.');
  }

  // Read the file from local storage
  const fileContent = fs.readFileSync(file.path);

  // S3 upload parameters
  const params = {
    Bucket: config.aws.bucketName,
    Key: file.originalname,
    Body: fileContent,
  };

  try {
    // Upload the file to S3 with progress
    const uploadPromise = s3.send(new PutObjectCommand(params));
    uploadPromise.on('httpUploadProgress', (progress) => {
      const percent = Math.round((progress.loaded / progress.total) * 100);
      console.log('Upload Progress:', percent, '%');
      // Send progress to the client (you may want to use WebSockets or another mechanism)
      res.write(`data: ${JSON.stringify({ progress: percent })}\n\n`);
    });

    await uploadPromise;

    // Optionally, you can delete the local file after uploading to S3
    fs.unlinkSync(file.path);

    res.status(200).send('File uploaded successfully!');
  } catch (err) {
    console.error('Error uploading file to S3:', err);
    res.status(500).send('Internal Server Error');
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
