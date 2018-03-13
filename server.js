const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const exec = require('child_process').exec;
const Rserve = require('rserve-js');
const path = require('path');
const request = require('request');
const pgp = require('pg-promise')();

var app = express();

app.use(bodyParser.json({limit: '500kb'}));
app.use(bodyParser.text({limit: '1000kb'}));
app.use(bodyParser.raw({limit: '500kb'}));

app.use(express.static('public'));

var jsonParser = bodyParser.json();
var textParser = bodyParser.text();
var rawParser = bodyParser.raw();

const genecn = {
    host: 'localhost',
    port: '5432',
    database: 'mydb',
    user: 'Jake'
};

const db = pgp(genecn);

fs.readFile("private/data/allen/samp_list.txt",'utf8',(err,text) => {
    const sample_list = text.split('\n');

    app.get('/gene_val/:geneID',(req,res) => {

	db.one('SELECT vals FROM gene_vals WHERE gene_id = $1', req.params.geneID, vals => vals.vals)
	    .then((data) => {
		data = data.split(',').map(x => parseFloat(x));

		response_data = {};

		for(i = 0; i < sample_list.length; i++){
		    response_data[sample_list[i]] = Math.log(data[i]+1);
		}

		res.set({
		    'Content-Type': 'application/json'});

		if(Object.keys(response_data).length == sample_list.length){
		    res.send(response_data);
		}
		
	    });

    });

});

app.get('/', (req, res) =>  {
    // db.any('select * from gene',[true]).
    // 	then((data) => {
    // 	    console.log(data);
    // 	}).
    // 	catch((error) => {
    // 	    console.log(error);
    // 	});
    
    res.sendFile(path.join(__dirname + '/index.html'));
});


app.get('/ols/:resourceIRI/:nodeID',(req, res) => {

    var url = 'https://www.ebi.ac.uk/ols/api/ontologies/terms/' + req.params.resourceIRI + '/children/jstree/' + req.params.nodeID;
    req.pipe(request(url)).pipe(res);

});

app.post('/euclid_pca',textParser, (req, res) => {
    if(!req.body) {res.sendStatus(400); return;};

    var num = Math.floor(Math.random()*8192);
    // var num = 2100;

    fs.writeFile("private/tmp/incoming/entry_"+num+".tsv",req.body,(err) => {
	if(err) {
	    console.log(err);
	    return;
	}

	console.log('Data written to private/tmp/incoming/entry_'+num+'.tsv');

	exec('echo ' + num + ' | Rscript public/src/R/euclidian_pca_distance.R', (error, stdout, stderr) => {
    	    if (error) {
    		console.error(`exec error: ${error}`);
    		res.send(error);
    		return;
    	    }
    	    console.log(`stdout: ${stdout}`);
    	    console.log(`stderr: ${stderr}`);

	    res.set({
	    	'Content-Type': 'text/plain'});

	    res.sendFile('entry_'+num+'.tsv',{ root: path.join(__dirname+'/private/tmp/outgoing/')},function(err){
	    	if(err) {
		    console.error(`exec error: ${err}`);
	    	    res.send(error);
	    	    return;
	    	}
	    	else{
		    console.log('file sent');
	    	    return;
	    	}
	    });
	    
	    return;
	});
	return;
    });
});

const server = app.listen(3000,function () {
    console.log('Example app listening on port 3000');
});

server.timeout = 360000;
