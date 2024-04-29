const express = require('express');
const multer = require('multer');
const { convert } = require('pdf-poppler');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const port = 3000;
app.use(cors());

// Crear directorios si no existen
const uploadDir = path.join(__dirname, 'uploads');
const outputDir = path.join(__dirname, 'output');

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
}

// Configuración de almacenamiento de Multer para archivos PDF
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

app.post('/imageToPdf', upload.single('pdf'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  const pdfPath = req.file.path;
  const outputFilePrefix = path.basename(pdfPath, path.extname(pdfPath));
  const outputPath = path.join(outputDir, outputFilePrefix);

  // Crear directorio específico para las imágenes de este PDF
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath);
  }

  let opts = {
    format: 'jpeg',
    out_dir: outputPath,
    out_prefix: outputFilePrefix,
    page: null
  };

  convert(pdfPath, opts)
    .then(() => {
      fs.readdir(outputPath, (err, files) => {
        if (err) {
          return res.status(500).send('Failed to list images.');
        }
        const imageUrls = files.map(file => `${req.protocol}://${req.get('host')}/images/${outputFilePrefix}/${file}`);
        res.json({ images: imageUrls });

        // Programar la eliminación del directorio de imágenes y del archivo PDF subido
        setTimeout(() => {
          // Eliminar el directorio de imágenes
          fs.rmdir(outputPath, { recursive: true }, (err) => {
            if (err) {
              console.log('Failed to delete output directory:', outputPath, err);
            } else {
              console.log('Output directory deleted:', outputPath);
            }
          });
          // Eliminar el archivo PDF
          fs.unlink(pdfPath, (err) => {
            if (err) {
              console.log('Failed to delete PDF file:', pdfPath, err);
            } else {
              console.log('PDF file deleted:', pdfPath);
            }
          });
        }, 300000); // 300000 ms = 5 minutos
      });
    })
    .catch(err => {
      res.status(500).send('Error converting PDF: ' + err);
    });
});

app.use('/images', express.static(outputDir));

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
