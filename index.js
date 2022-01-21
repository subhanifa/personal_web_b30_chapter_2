const express = require('express')

const bcrypt = require('bcrypt')
const session = require('express-session')
const flash = require('express-flash')

const app = express()
const PORT =  process.env.PORT || 4000
const db = require('./connection/db')
const upload = require('./middlewares/fileUpload')

app.set('view engine', 'hbs') // set hbs
app.use('/public', express.static(__dirname + '/public'))
app.use('/uploads', express.static(__dirname + '/uploads'))
app.use(express.urlencoded({extended: false}))

app.use(
    session({
        cookie: {
            maxAge: 2 * 60 * 60 * 1000, // penyimpanan data selama 2 jam, setelah 2 jam akan hilang
            secure: false,
            httpOnly: true,
        },
        store: new session.MemoryStore(),
        saveUninitialized: true,
        resave: false,
        secret: 'secretValue'
    })
)

app.use(flash())


function getFullTime(time) {
    let month = ['January', 'Februari', 'March', 'April', 'May', 'June', 'July', 'August', 'September','October', 'November','December']

    let date = time.getDate() // mendapatkan tanggal
    let monthIndex = time.getMonth()  // mendapatkan bulan
    let year = time.getFullYear() // mendpatkan tahun
  
    let hours = time.getHours() // mendapatkan jam
    let minutes = time.getMinutes() // mendapatkan menit
  
    return `${date} ${month[monthIndex]} ${year} ${hours}:${minutes} WIB`
}

function getDistanceTime(time) {
    let timePost = time
    let timeNow = new Date ()
  
    let distance = timeNow - timePost
  
    // convert milisecond
    let milisecond = 1000
    let secondInHours = 3600
    let hoursInDay = 23
    let second = 60
    let minute = 60
    
  
    let distanceDay = Math.floor (distance / (milisecond * secondInHours * hoursInDay))
    let distanceHours = Math.floor (distance / (milisecond * second * minute))
    let distanceMinutes = Math.floor (distance / (milisecond * second))
    let distanceSecond = Math.floor (distance / milisecond)
  
    // Create Condition 
    if (distanceDay >= 1 ) {
      return(`${distanceDay} day ago`);
  
    } else {
      if (distanceHours >=1 ) {
        return(`${distanceHours} hours ago`);
  
      } else {
        if (distanceMinutes >= 1) {
          return(`${distanceMinutes} minutes ago`);
  
        } else {
            return(`${distanceSecond} seconds ago`);
        }
      }
    }
  }


app.get('/', function(request, response) {
    db.connect(function(err, client, done)  {
        if (err) throw err

        client.query(`SELECT * FROM tb_exp`, function(err, result) {
            if (err) throw err

            let dataView = result.rows            

            response.render('index', {blog: dataView, isLogin: request.session.isLogin, user: request.session.user})
        })
    })
})


app.get('/add-blog', function(request, response) {

    if(!request.session.isLogin) {
        request.flash('danger', 'PLEASE LOGIN!')
        return response.redirect('/login')
    }  

    response.render('add-blog', {isLogin: request.session.isLogin, user: request.session.user})
})

app.get('/register', function(request, response) {
    response.render('register')
})

app.post('/register', function(request, response) {

    const {inputName, inputEmail, inputPassword} = request.body
    const hashedPassword = bcrypt.hashSync(inputPassword, 10)

    let query = `INSERT INTO tb_user (name, email, password) VALUES ('${inputName}', '${inputEmail}', '${hashedPassword}')`

    db.connect (function (err, client, done)    {

        if (err) throw err
        client.query (query, function (err, result) {

            if (err) throw err
            response.redirect('/login')

        })
    })
})

app.get('/login', function(request, response) {
    response.render('login')
})

app.post('/login', function(request, response) {

    const {inputEmail, inputPassword} = request.body
    
    let query = `SELECT * FROM tb_user WHERE email = '${inputEmail}'`

    db.connect(function (err, client, done) {
        if (err) throw err

        client.query(query, function (err, result)  {
            if (err) throw err

            if (result.rows.length == 0) {
                request.flash('danger', 'Email is Not Registered, Sign Up First')
                response.redirect('/login')
                return;
            }

            const isMatch = bcrypt.compareSync(inputPassword, result.rows[0].password)
            if (isMatch) {
                request.session.isLogin = true
                request.session.user = {
                    id: result.rows[0].id,
                    name: result.rows[0].name,
                    email: result.rows[0].email
                }
                
                request.flash('success', 'Login Success')
                response.redirect('/blog')
            } else {
                request.flash('danger', 'Email & Password is Not Match')
                response.redirect('/login')
                console.log(isMatch);
            }
        })
    })
})

app.get('/contact', function(request, response) {
    response.render('contact', {isLogin: request.session.isLogin, user: request.session.user})
})

app.get('/blog', function(request, response) {

    const query = `SELECT tb_blog.id, title, tb_blog.content, tb_blog.image, tb_blog.post_at, tb_user.name AS author, tb_blog.author_id
    FROM tb_blog LEFT JOIN tb_user ON tb_blog.author_id = tb_user.id`
    
    db.connect(function(err, client, done) {
        if (err) throw err

        client.query(query, function(err, result) {           
            if (err) throw err
            
            let dataView = result.rows
            let newData = dataView.map(function(data){
                return {
                    ...data,
                    isLogin: request.session.isLogin,
                    postAt: getFullTime(data.post_at),
                    distance: getDistanceTime(data.post_at)
                } 
            })      
            response.render('blog', {isLogin : request.session.isLogin, user: request.session.user, blogs: newData})
        })
    })    
})

app.post('/blog', upload.single('inputImage'), function(request, response) {

    let data = request.body
    let authorId = request.session.user.id
    let image = request.file.filename
    
    db.connect(function(err, client, done)  {
        if (err) throw err

        client.query(`INSERT INTO tb_blog(title, content, image, author_id) VALUES 
        ('${data.inputTitle}','${data.inputContent}','${image}', '${authorId}')`, function(err, result) {
            if (err) throw err

            response.redirect('/blog')
        })
    })
})

app.get('/edit-blog/:id', function(request, response) {   
    
    let id = request.params.id
    let query = `SELECT * FROM tb_blog WHERE id = ${id}`

    db.connect(function (err, client, done) {
        if (err) throw err

        client.query(query,function (err, result) {
            if (err) throw err
        
            let dataView = result.rows[0]         

            response.render('edit-blog', {blog: dataView, id: id})
        })
    })
})


app.post ('/edit-blog/:id', upload.single('inputImage'), function(request, response) {

    let id = request.params.id
    let data = request.body  
    let image = request.file.filename
    let query = `UPDATE tb_blog SET title = '${data.editTitle}', content = '${data.editContent}', image = '${image}' WHERE id = ${id}`   

    db.connect(function(err, client, done)  {
        if (err) throw err

        client.query(query, function(err, result) {
            if (err) throw err

            response.redirect('/blog')
        })
    })
})

app.get('/delete-blog/:id', function(request, response) {

    let id = request.params.id

    let query = `DELETE FROM tb_blog WHERE id = ${id}`

    db.connect(function (err, client, done) {
        if (err) throw err

        client.query(query,function (err, result) {
            if (err) throw err
            
            response.redirect('/blog')
        })
    })

})


app.get('/blog-detail/:id', function(request, response) {
 
    let id = request.params.id
    const query = `SELECT tb_blog.id, title, tb_blog.content, tb_blog.image, tb_blog.post_at, tb_user.name AS author, tb_blog.author_id
    FROM tb_blog LEFT JOIN tb_user ON tb_blog.author_id = tb_user.id`


    db.connect(function(err, client, done)  {
        if (err) throw err

        client.query(query, function(err, result) {
            if (err) throw err

            let dataView = result.rows[0]
            let dataDetail = {
                ...dataView,
                postAt: getFullTime(dataView.post_at)
            }
            
            response.render('blog-detail', {id: id, blog: dataDetail, isLogin: request.session.isLogin, user: request.session.user})
        })
    })
})

app.get('/logout', function(request, response)  {
    request.session.destroy()

    response.redirect('/blog')
})

app.listen(PORT, function() {
    console.log(`Server starting on PORT ${PORT}`);
})