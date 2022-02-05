const express = require('express')
const fs = require('fs')
const util = require('./wordUtil.js')
util.initLists();
const app = express()
const port = 3000

app.use(express.static(__dirname + '/public'));
app.get('/api', (req, res) => {
	res.setHeader('Access-Control-Allow-Origin','*')
	if(req.query.ask=="request"){
		debugger
		var randVals = util.getRandomWords(req.query.count)
		console.log(randVals)
		res.send(randVals)
	} else if(req.query.ask=="check"){
		debugger
		var dat = []
		dat.push(util.isValid(req.query.word))
		res.send(dat)
		console.log(dat)
	}
})
app.use(express.static(__dirname + '/public'));
app.get('/index',(req,res)=>{
	res.setHeader('Access-Control-Allow-Origin','*')
	res.sendFile(__dirname + "/public/index.html",(err) => {
		if(err){
			console.log(err);
			res.end(err.message);
		}
	});
})
app.use(express.static(__dirname + '/public'));
app.listen(port, () => {
	console.log(`Example app listening at http://localhost:${port}`)
})