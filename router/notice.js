const express = require('express');
const router = express.Router();
const Notice = require('../schemas/notice');
const { verifyToken } = require("./middlewares/authorization");
const { findWriter } = require("./middlewares/findWriter");
const { adminConfirmation } = require('./middlewares/adminConfirmation');
const { formatDateSend } = require('../js/formatDateSend');
const imageUploader = require('./controllers/image.controller').imageUpload;
const fs = require('fs');

router.use(express.static('images/notices'));

router.get('/list', (req, res) => {
    Notice.find({}).count()
        .then((count) => {
            Notice.find({}, { contents: false, image: false }).sort({_id:-1})
                .then((noticeList) => {
                    res.json({ status: "success", count: count,noticeList: noticeList});
                })
                .catch(err=>{
                    console.log(err);
                    res.status(500).json({status:"error"})
                })
        })
        .catch(err=>{
            console.log(err);
            res.status(500).json({status:"error"});
        })
})

router.get('/list/:page', (req, res) => {
    var page = req.params.page;
    Notice.find({}).count()
        .then((count) => {
            Notice.find({}, { contents: false, image: false }).sort({ "date": -1 }).skip((page - 1) * 10).limit(10)
                .then((noticeList) => {
                    res.json({ status: "success", count: count, noticeList: noticeList});
                })
                .catch((err) => {
                    console.log(err);
                    res.status(500).send({ status: "err" });
                });
        })
        .catch((err) => {
            console.log(err);
            res.status(500).json({ status: "error" });
        })
});

router.get('/:noticeId', (req, res) => {
    Notice.findOneAndUpdate({ _id: req.params.noticeId })
        .then((notice) => {
            res.json({ status: "success", notice: notice});
        })
        .catch((err) => {
            console.log(err);
            res.status(500).json({ status: "err" });
        });
});

router.post('/', verifyToken, adminConfirmation, findWriter, imageUploader("images/notices").single("image"), (req, res, next) => {
    Notice.create({
        writer: res.locals.writer,
        date: formatDateSend(new Date()),
        image: req.file != undefined ? req.file.filename : null,
        title: req.body.title,
        contents: req.body.contents,
        view: 0
    }, function (err) {
        if (err) {
            console.log(err)
            res.status(500).json({ status: "error" });
        }
        else {
            res.json({ status: "success" });
        }
    });

});

router.delete('/:noticeId', verifyToken, adminConfirmation, (req, res) => {

    Notice.findOneAndRemove({ _id: req.params.noticeId })
        .exec(function (err, item) {
            var filePath = './images/notices/' + item.image;
        
            fs.unlinkSync(filePath);
            if (err) {
                res.status(500).send({ status: "err" });
            }
            if (!item) {
                res.status(400).json({ status: "none" });
            }
            res.json({ status: "success" });
        })
        .catch(err=>{
            console.log(err);
            res.status(500).json({status:"error"});
        })

});

module.exports = router;