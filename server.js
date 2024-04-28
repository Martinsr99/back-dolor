const express = require('express');
const multer = require('multer');
const { convert } = require('pdf-poppler');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const archiver = require('archiver');

const app = express();
const upload = multer({ dest: 'uploads/' }); // Configurar multer
const port = 3000;

app.use(cors());
app.use('/images', express.static('output')); // Servir imágenes estáticamente

app.post('/imageToPdf', upload.single('pdf'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    const pdfPath = req.file.path;
    const outputPath = path.join(__dirname, 'output');

    let opts = {
        format: 'jpeg',
        out_dir: outputPath,
        out_prefix: path.basename(pdfPath, path.extname(pdfPath)),
        page: null
    };

    convert(pdfPath, opts).then(() => {
        const zip = archiver('zip', { zlib: { level: 9 } });
        const output = fs.createWriteStream(`${outputPath}/${req.file.filename}.zip`);

        zip.pipe(output);
        zip.directory(outputPath, false);
        zip.finalize();

        output.on('close', function() {
            res.send({ url: `/images/${req.file.filename}.zip` });
        });
    }).catch(err => {
        res.status(500).send('Failed to convert PDF: ' + err.message);
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
