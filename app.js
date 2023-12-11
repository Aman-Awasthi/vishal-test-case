const express = require('express');
const multer = require('multer');
const AWS = require('aws-sdk');
const fs = require('fs');

const app = express();
const port = 3000;

// Configure AWS SDK with your credentials and S3 bucket details
const s3 = new AWS.S3({
  accessKeyId: 'YOUR_ACCESS_KEY',
  secretAccessKey: 'YOUR_SECRET_KEY',
});

// Multer middleware for handling file uploads
const upload = multer({ dest: 'uploads/' });

// Serve HTML page
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// Handle file upload
app.post('/upload', upload.single('video'), (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).send('No file uploaded.');
  }

  // Read the file from the local storage
  const fileContent = fs.readFileSync(file.path);

  // S3 upload parameters
  const params = {
    Bucket: 'YOUR_S3_BUCKET_NAME',
    Key: file.originalname,
    Body: fileContent,
  };

  // Upload the file to S3
  s3.upload(params, (err, data) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Internal Server Error');
    }

    // Optionally, you can delete the local file after uploading to S3
    fs.unlinkSync(file.path);

    res.status(200).send('File uploaded successfully!');
  });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
