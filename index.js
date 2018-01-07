const Express = require('express');
const Knex = require('knex');
const bodyParser = require('body-parser');
const _ = require('lodash');
const jsonParser = bodyParser.json();
//upload
var multer  = require('multer');
var upload = multer({ dest: 'uploads/' });
var fs = require('fs');
var path = require('path');
//crypto-js
const helmet = require('helmet');
const SHA256 = require('crypto-js/sha256');
const Utf8 = require('crypto-js/enc-utf8');
const Base64  = require('crypto-js/enc-base64');
var cors = require('cors')

const app = Express();
app.use(helmet())
app.use(cors())

const knex = require('knex')({
    client: 'mysql',
    connection: {
        host : '192.168.88.112',
        user : 'root',
        port : 13306,
        password : 'root',
        database : 'Russian'
    }
});
//#region staff
app.get('/staff', (req, res) => {
    return knex('staff').select('name','email','logo')
    .then(staffList => {
        return res.status(200).json(staffList);
    });
});

app.get('/staff/:id', (req, res) => {
    return knex('staff').select('name','email','logo').where({id: req.params.id}).limit(1)
    .then(staffList => {
        if(staffList.length === 0) 
            return res.status(404).json({message: 'staff not found.'});
        return res.status(200).json(staffList[0]);
    });
});

app.post('/staff/login', jsonParser, (req, res) => {
    let body = _.pick(req.body, ['name', 'password']);
    body.password = JSON.stringify(SHA256(body.password + 'Russian'));

    return knex('staff').where({name: body.name}).select('password').limit(1)
    .then(check => {
        if(check[0].password === body.password)
            return res.status(200).json({message: 'Logged in'});
        else
            return res.status(200).json({message: 'Not logged in'});
    })
    .catch(err => {
        return res.status(404).json({message: 'Staff not found'});
    });
});

app.post('/staff/add', jsonParser, (req, res) => {
    let body = _.pick(req.body, ['name', 'password', 'email']);

    if(body.name === undefined || body.password === undefined || body.email === undefined)
        return res.status(200).json({message: 'error'});
    if(body.name === "" || body.password === "" || body.email === "")
        return res.status(200).json({message: 'error'});
    body.password = JSON.stringify(SHA256(body.password + 'Russian'));
    
    return knex('staff').where({name: body.name}).select('name').limit(1)
    .then(check => {
        if(check.length === 0)
            return knex('staff').insert(body)
            .then(staff => {
                return res.status(201).json({message: 'Added successfully'});
            });
        else
            return res.status(404).json({message: 'Name is already used'});
    })
    .catch(err => {
        console.error(err);
    });
});

app.patch('/staff/email', jsonParser, (req, res) => {
    let body = _.pick(req.body, ['email']);

    return knex('staff').where({name: req.body.name}).update(body)
    .then(() => {
        return res.status(200).json({message: 'Successfully'});
    })
    .catch(err => {
        return res.status(404).json({message: 'Error'});
    });
});

app.patch('/staff/passwd', jsonParser, (req, res) => {
    let body = _.pick(req.body, ['name', 'password', 'newpwd']);
    if(body.password === undefined || body.newpwd === undefined)
        return res.status(404).json({message: 'No password'});
    if(body.password === "" || body.newpwd === "")
        return res.status(404).json({message: 'No password'});

    body.password = JSON.stringify(SHA256(body.password + 'Russian'));
    body.newpwd = JSON.stringify(SHA256(body.newpwd + 'Russian'));

    return knex('staff').where({name: req.body.name})
    .select('password').limit(1)
    .then(pwd => {
        if(pwd[0].password === body.password)
            return knex('staff').where({name: req.body.name})
            .update({password: body.newpwd})
            .then(() => {
                return res.status(200).json({message: 'Successfully'});
            });
        else
            res.status(404).json({message: 'Password error'});
    })
    .catch(err => {
        return res.status(404).send();
    });   
});

app.delete('/staff/del', jsonParser, (req, res) => {
    
    return knex('staff').where({name: req.body.name}).limit(1).del()
    .then(() => {
        return res.status(204).send();
    })
    .catch(() => {
        return res.status(404).send();
    });
})
//#endregion

//#region sidebar
app.get('/sidebar', (req, res) => {
    return knex('sidebar').select('title', 'content', 'create_at')
    .orderBy('create_at', 'desc')
    .then(sidebarList => {
        sidebarList.forEach(list => {
            list.create_at = new Date((list.create_at + 8 * 3600) * 1000);
        });
        return res.status(200).json(sidebarList);
    });
});

app.post('/sidebar/search', jsonParser, (req, res) => {
    let body = _.pick(req.body, ['title']);

    return knex('sidebar').select('title', 'content', 'create_at')
    .where({title: body.title}).limit(1)
    .then(sidebarList => {
        if(sidebarList.length === 0) 
            return res.status(404).json({message: 'Not found.'});
        sidebarList[0].create_at = new Date((sidebarList[0].create_at + 8 * 3600) * 1000);
        return res.status(200).json(sidebarList[0]);
    })
    .catch(err => {
        return res.status(404).send();
    });
});

app.post('/sidebar/add', jsonParser, (req, res) => {
    let body = _.pick(req.body, ['title', 'content']);
    body.create_at = Math.floor(new Date().getTime() / 1000);

    return knex('sidebar').where({title: body.title}).limit(1)
    .then(check => {
        if(check.length === 0)
            return knex('sidebar').insert(body)
            .then(staff => {
                return res.status(201).json({message: 'Added successfully'});
            });
        else
            return res.status(404).json({message: 'Title is already used'});
    })
    .catch(err => {
        console.error(err);
    });
});

app.patch('/sidebar/modify', jsonParser, (req, res) => {
    let body = _.pick(req.body, ['content']);
    body.create_at = Math.floor(new Date().getTime() / 1000);
    if(req.body.newtitle !== undefined)
        body.title = req.body.newtitle;

    return knex('sidebar').where({title: req.body.title}).limit(1)
    .then(sidebarList => {
        if(sidebarList.length === 0)
            return res.status(404).json({message: 'Title not found'});
        else
            return knex('sidebar').where({title: req.body.title}).update(body)
            .then(() => {
                return res.status(200).json({message: 'Successfully'});
            });
    })    
    .catch(err => {
        return res.status(404).json({message: 'Error'});
    });
});

app.delete('/sidebar/del', jsonParser, (req, res) => {
    return knex('sidebar').where({title: req.body.title}).limit(1).del()
    .then(() => {
        return res.status(204).send();
    })
    .catch(() => {
        return res.status(404).send();
    });
})

//#endregion

//#region navbar

app.get('/navbar', (req, res) => {
    return knex('navbar').select('title', 'content', 'create_at')
    .orderBy('create_at', 'desc')
    .then(navbarList => {
        navbarList.forEach(list => {
            list.create_at = new Date((list.create_at + 8 * 3600) * 1000);
        });
        return res.status(200).json(navbarList);
    });
});

app.post('/navbar/search', jsonParser, (req, res) => {
    let body = _.pick(req.body, ['title']);

    return knex('navbar').select('title', 'content', 'create_at')
    .where({title: body.title}).limit(1)
    .then(navbarList => {
        if(navbarList.length === 0)
            return res.status(404).json({message: 'Not found.'});
        navbarList[0].create_at = new Date((navbarList[0].create_at + 8 * 3600) * 1000);
        return res.status(200).json(navbarList[0]);
    })
    .catch(err => {
        return res.status(404).send();
    });
});

app.post('/navbar/add', jsonParser, (req, res) => {
    let body = _.pick(req.body, ['title', 'content']);
    body.create_at = Math.floor(new Date().getTime() / 1000);

    return knex('navbar').where({title: body.title}).limit(1)
    .then(check => {
        if(check.length === 0)
            return knex('navbar').insert(body)
            .then(staff => {
                return res.status(201).json({message: 'Added successfully'});
            });
        else
            return res.status(404).json({message: 'title is already used'});
    })
    .catch(err => {
        console.error(err);
    });
});

app.patch('/navbar/modify', jsonParser, (req, res) => {
    let body = _.pick(req.body, ['content']);
    body.create_at = Math.floor(new Date().getTime() / 1000);
    if(req.body.newtitle !== undefined)
    body.title = req.body.newtitle;

    return knex('navbar').where({title: req.body.title}).limit(1)
    .then(navbarList => {
        if(navbarList.length === 0)
            return res.status(404).json({message: 'title not found'});
        else
            return knex('navbar').where({title: req.body.title}).update(body)
            .then(() => {
                return res.status(200).json({message: 'Successfully'});
            });
    })    
    .catch(err => {
        return res.status(404).json({message: 'Error'});
    });
});

app.delete('/navbar/del', jsonParser, (req, res) => {
    return knex('navbar').where({title: req.body.title}).limit(1).del()
    .then(() => {
        return res.status(204).send();
    })
    .catch(() => {
        return res.status(404).send();
    });
})

//#endregion

app.post('/upload', upload.single('file'), function (req, res, next) {
    fs.rename(path.join(__dirname, 'uploads', req.file.filename), 
    path.join(__dirname, 'uploads', req.body.name), err => {
        return  res.status(200).send('OK');
    });
});

app.get('/introduction', (req, res) => {
    return knex('introduction').select('content')
    .then(contentList => {
        return res.status(200).json(contentList);
    });
});

app.get('/introduction:id', (req, res) => {
    return knex('introduction').select('content').where({id: req.params.id}).limit(1)
    .then(staffList => {
        if(staffList.length === 0) 
        return res.status(404).json({message: 'introduction not found.'});
        return res.status(200).json(introductionList);
    });
});


app.listen(3001, () => { console.log('Server started.') });

