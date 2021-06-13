const express = require('express');
const axios = require('axios');
const ejs = require('ejs');
const sqlite = require('sqlite');
const sqlite3 = require('sqlite3');
const fs = require('fs').promises;
const { response, json } = require('express');

const app = express();
const port = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static('views'));

const getDBConnection = async() => {
    const db = await sqlite.open({
        filename: 'product.db',
        driver: sqlite3.Database
    });
    return db;
}

const insertData = async (db) => {
    await db.run('delete from product');
    await axios.get('http://localhost:3000/product.json')
        .then(response => response.data)
        .then(data => {
            data.forEach(d => {
                db.run(`insert into product values(NULL, "/images/icon-food.jpg", "${d.name}", ${d.price}, "${d.category}", "${d.unit}", "${d.etc}", ${d.offset})`);
            });
        }).catch((e) => {
            console.log(e.message);
        });
}

app.get('/', async (req, res) => {
    const db = await getDBConnection();
    const data = await db.all('select * from product');
    res.render("index", {
        category: "전체",
        search: "",
        data: data
    });

    db.close();
});

app.post('/filtered', async (req, res) => {
    const db = await getDBConnection();

    const category = req.body.category;
    const search = req.body.search;

    let data;
    if (category === "전체") {
        if (search.trim() === '') {
            data = await db.all('select * from product');
        } else {
            data = await db.all(`select * from product where product_title like "%${search}%"`);
        }
    } else {
        if (search.trim() === '') {
            data = await db.all(`select * from product where product_category="${category}"`);
        } else {
            data = await db.all(`select * from product where product_title like "%${search}%" and product_category="${category}"`);
        }
    }

    res.render("index", {
        category: category,
        search: search,
        data: data
    });

    db.close();
});

app.get('/product/:prod_id', async (req, res) => {
    const prod_id = req.params.prod_id;
    const db = await getDBConnection();
    const data = await db.all(`select * from product where product_id="${prod_id}"`);;
    
    let file = await fs.readFile('comment.json', 'utf8')
    const comments = JSON.parse(file);
    
    res.render("product", {
        data: data[0],
        comments: comments[prod_id]
    });

    db.close();
});

app.post('/product/comment/', async (req, res) => {
    const comment = req.body.comment;
    const prod_id = req.body.prod_id;
    if (comment == undefined || comment.trim() == "") return res.send('no comment');


    let file = await fs.readFile('comment.json', 'utf8');
    let comments = JSON.parse(file);
    console.log(comment)
    if (comments[prod_id] == null) {
        comments[prod_id] = [comment];
    } else {
        comments[prod_id].push(comment);
    }
    await fs.writeFile('comment.json', JSON.stringify(comments));
})

app.get('/insert-data', async (req, res) => {
    const db = await getDBConnection();

    let message = 'inserting data form product.json to product.db...<br/><br/>'

    insertData(db)
        .then(() => {
            db.all('select * from product')
                .then((data) => {
                    data.forEach(d => {
                        message += `${JSON.stringify(d)}<br/>`;
                    })
                    res.send(message);
                });
        })
        .catch((e) => {
            console.log(e.message);
        });
    
    db.close();
});

app.listen(port, () => console.log(`listening on port ${port}`));
