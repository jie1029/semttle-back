const express = require('express');
const router = express.Router();
const Notice = require('../schemas/notice');
const { verifyToken } = require("./middlewares/authorization");
const { findWriter } = require("./middlewares/findWriter");
const { adminConfirmation } = require('./middlewares/adminConfirmation');
const { formatDateSend } = require('../js/formatDateSend');
const imageUploader = require('./controllers/image.controller').imageUpload;
const imageCleaner = require('./controllers/image.controller').imageClean;
const { checkBlackList } = require("./middlewares/authorization");

router.use('/images', express.static('images/notices'));

router.get('/list', (req, res) => {

    Notice.find({}, { contents: false, image: false }).sort({ _id: -1 })
        .then((noticeList) => {
            res.json({ status: "success", count: noticeList.length, noticeList: noticeList });
        })
        .catch(err => {
            console.log(err);
            res.status(500).json({ status: "error" })
        })

})

router.get('/list/:page', (req, res) => {
    var page = req.params.page;
    Notice.find({}).count()
        .then((count) => {
            Notice.find({}, { contents: false, image: false }).sort({ "date": -1 }).skip((page - 1) * 10).limit(10)
                .then((noticeList) => {
                    res.json({ status: "success", count: count, noticeList: noticeList });
                })
                .catch((err) => {
                    console.log(err);
                    res.status(500).json({ status: "err" });
                });
        })
        .catch((err) => {
            console.log(err);
            res.status(500).json({ status: "error" });
        })
});

router.get('/:noticeId', (req, res) => {
    Notice.findOneAndUpdate({ _id: req.params.noticeId }, { $inc: { view: 1 } }, { new: true }).exec()
        .then((notice) => {
            res.json({ status: "success", notice: notice });
        })
        .catch((err) => {
            console.log(err);
            res.status(500).json({ status: "err" });
        });
});

router.post('/', verifyToken,checkBlackList, adminConfirmation, findWriter, imageUploader("images/notices").single("image"), (req, res, next) => {
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

router.delete('/:noticeId', verifyToken,checkBlackList, adminConfirmation, (req, res) => {

    Notice.findOneAndRemove({ _id: req.params.noticeId })
        .then((notice) => {
            if (notice.image != "default.jpg") {
                imageCleaner("images/notices/", notice.image);
            }
            res.json({ status: "success" });
        })
        .catch(err => {
            console.log(err);
            res.status(500).json({ status: "error" });
        })
});

module.exports = router;