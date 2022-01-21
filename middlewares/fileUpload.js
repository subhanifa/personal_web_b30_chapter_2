const multer = require('multer')

const storage = multer.diskStorage({
    destination: function(request, file, cb) {
        cb(null, "uploads")
    },
    filename: function(request, file, cb) {
        cb(null, Date.now() + "-" + file.originalname)
    }
})


const upload = multer({storage})

module.exports = upload