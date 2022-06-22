const express = require('express');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const methodOverride = require('method-override');
const bodyParser = require('body-parser');

const app = express();
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(methodOverride('_method'));
// app.use()
const mongoURI = "mongodb://localhost:27017/filedb";
const conn = mongoose.createConnection(mongoURI, () => {
    console.log("connected to db");
});




let gfs, gfsbucket;
conn.once('open', () => {
    gfsbucket = new mongoose.mongo.GridFSBucket(conn.db, {
        bucketName: 'uploads'
    })
    gfs = Grid(conn.db, mongoose.mongo);
    gfs.collection("uploads");
    // console.log(gfsbucket); 

})

// create storage engine 

const storage = new GridFsStorage({
    url: mongoURI,
    file: (req, file) => {
        // console.log(file);
        return new Promise((resolve, reject) => {
            crypto.randomBytes(16, (err, buf) => {
                if (err) {
                    return reject(err);
                }

                const filename = buf.toString('hex') + path.extname(file.originalname);
                const fileInfo = {
                    filename: filename,
                    bucketName: 'uploads'
                };
                resolve(fileInfo);
            });
        });
    }
});
var upload = multer({
    storage: storage,
    limits: { fileSize: 20000000 }
});

app.get("/", (req, res) => {
    gfs.files.find().toArray((err, files) => {
        if (!files || files.length === 0) {
            res.render("index", { files: false });
        } else {
            files.map((file) => {
                if (file.contentType === 'image/png' || file.contentType === 'image/jpeg') {
                    file.isImage = true;
                } else {
                    file.isImage = false;
                }
            })
            res.render("index", { files: files });
        }

    })
})

// uploads files to db 

app.post("/upload", upload.single('file'), (req, res) => {

    res.redirect("/");

})

app.get("/files", (req, res) => {
    // console.log(gfs.files); 
    gfs.files.find().toArray((err, files) => {
        if (!files || files.length === 0) {
            return res.status(404).json({
                err: "No files exists!"
            })
        }
        return res.json(files)
    })
})

app.get("/image/:filename", async (req, res) => {

    const file = await gfs.files.findOne({ filename: req.params.filename });
    // console.log(file); 
    if (file.contentType === "image/png" || file.contentType === 'image/jpeg') {

        const readstream = gfsbucket.openDownloadStreamByName(req.params.filename)
        // console.log(readstream);
        readstream.pipe(res);

    }
})

// deleting a file 

app.delete("/files/:id", (req, res) => {
    const id = new mongoose.Types.ObjectId(req.params.id); 
    // console.log(id, req.params.id);  -> output -> new ObjectId("62b2a8ddcd447a424e4bfd0d") 62b2a8ddcd447a424e4bfd0d 
    gfsbucket.delete(new mongoose.Types.ObjectId(req.params.id), (er, dat) => {
        if (er) {
            console.log(er);
        }
        res.redirect("/");
    })
})


app.listen(8000, () => {
    console.log("Connected to server Successfully!!");
})