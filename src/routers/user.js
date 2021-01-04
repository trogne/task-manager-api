const express = require('express')
const multer = require('multer')
const sharp = require('sharp')
const User = require('../models/user')
const auth = require('../middleware/auth')
const { sendWelcomeEmail, sendCancelationEmail } = require('../emails/account')
const router = new express.Router()


router.post('/users', async (req, res) => {
    const user = new User(req.body)

    try {
        // await user.save()
        // sendWelcomeEmail(user.email, user.name)
        // const token = await user.generateAuthToken()
        // res.status(201).send({ user, token })
        //// update to do : user gets email, click a link, then login with token
        //// then, try 1-send request with auth header, 2-cookie, 3-session
        await user.save()
        const token = await user.generateAuthToken() // generate token before
        sendWelcomeEmail(user.email, user.name, token) // pass token as 3rd argument
        res.status(201).send({ user, token })
    } catch (e) {
        res.status(400).send(e)
    }
})



// const cookieParser = require('cookie-parser');
// router.use(cookieParser()) // npm i cookie-parser --save // router au lieu de app
// const session = require('express-session')
// //// start the session
// router.use(session({
//     name: 'server-session-cookie-id',
//     secret: 'my express secret',
//     saveUninitialized: true,
//     resave: true,
//     cookie: {
//         secure: false,
//         maxAge: 2160000000,
//         httpOnly: false
//     }
// }))

router.get('/verify/:token', async (req, res) => {
    console.log('VERIFIED')
    // res.send(`verified: <br>${req.params.token}<br><br>click <a href="/users/fiso?token=${req.params.token}">here</a> to view profile`) // GET /users/fiso?token=...
    // res.cookie('token', req.params.token) // with cookie-parser
    // req.session.token = req.params.token // wutg express-session
    res.send(`verified: <br>${req.params.token}<br><br>click <a href="/users/fiso">here</a> to view profile`) // GET /users/fiso
})


router.post('/users/login', async (req, res) => {
    try {
        const user = await User.findByCredentials(req.body.email, req.body.password)
        const token = await user.generateAuthToken()
        res.send({ user, token })
    } catch (e) {
        res.status(400).send()
    }
})

router.post('/users/logout', auth, async (req, res) => {
    try {
        req.user.tokens = req.user.tokens.filter((token) => {
            return token.token !== req.token
        })
        await req.user.save()

        res.send()
    } catch (e) {
        res.status(500).send()
    }
})

router.post('/users/logoutAll', auth, async (req, res) => {
    try {
        req.user.tokens = []
        await req.user.save()
        res.send()
    } catch (e) {
        res.status(500).send()
    }
})


// MY ADD
const jwt = require('jsonwebtoken')
router.get('/users/fiso', async (req, res) => {
    try {
        // const token = req.query.token
        // const token = req.cookies.token
        // const token = req.session.token
        const token = req.header('Authorization').replace('Bearer ', '')
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        const user = await User.findOne({ _id: decoded._id, 'tokens.token': token })

        if (!user) {
            throw new Error()
        }

        req.token = token
        req.user = user
    } catch (e) {
        console.log(e.message, ' !!!')
        res.status(401).send({ error: 'Please authenticate.' })
    }    
    res.send(req.user)
})
router.get('/users/me', auth, async (req, res) => {
    res.send(req.user)
})

router.patch('/users/me', auth, async (req, res) => {
    const updates = Object.keys(req.body)
    const allowedUpdates = ['name', 'email', 'password', 'age']
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update))

    if (!isValidOperation) {
        return res.status(400).send({ error: 'Invalid updates!' })
    }

    try {
        updates.forEach((update) => req.user[update] = req.body[update])
        await req.user.save()
        res.send(req.user)
    } catch (e) {
        res.status(400).send(e)
    }
})

router.delete('/users/me', auth, async (req, res) => {
    try {
        await req.user.remove()
        sendCancelationEmail(req.user.email, req.user.name)
        res.send(req.user)
    } catch (e) {
        res.status(500).send()
    }
})

const upload = multer({
    limits: {
        fileSize: 1000000
    },
    fileFilter(req, file, cb) {
        if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
            return cb(new Error('Please upload an image'))
        }

        cb(undefined, true)
    }
})

router.post('/users/me/avatar', auth, upload.single('avatar'), async (req, res) => {
    const buffer = await sharp(req.file.buffer).resize({ width: 250, height: 250 }).png().toBuffer()
    req.user.avatar = buffer
    await req.user.save()
    res.send()
}, (error, req, res, next) => {
    res.status(400).send({ error: error.message })
})

router.delete('/users/me/avatar', auth, async (req, res) => {
    req.user.avatar = undefined
    await req.user.save()
    res.send()
})

router.get('/users/:id/avatar', async (req, res) => {
    try {
        const user = await User.findById(req.params.id)

        if (!user || !user.avatar) {
            throw new Error()
        }

        res.set('Content-Type', 'image/png')
        res.send(user.avatar)
    } catch (e) {
        res.status(404).send()
    }
})

module.exports = router