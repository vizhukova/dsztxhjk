const express = require('express');
const port = 7070;
const app = express();
const vk = new (require('vk-io'));
const chain = vk.chain();
var fs = require('fs');
var request = require('request');

var config = require('./config');

const dest_save = config.dest_to_save; // путь куда сохранять файлы
const size = config.size;

vk.setting({
    app: 5889927,
    login: config.login, //логин пользователя под которым будем работать
    pass: config.pass,//пароль пользователя под которым будем работать
    phone: config.phone//телефон пользователя под которым будем работать
});

const log_file = './error.log.txt';

const auth = vk.standaloneAuth();
var documents;

/****************Work with log file**************************/
fs.writeFile(log_file, '');

var logError = function(error) {
    fs.appendFile(log_file, error);
}
/*******************************************/

auth.run()
.then((token) => {
    console.log('Token:',token);
    vk.setToken(token);
}).then(() => {
    chain.append('docs.search', {
        q: config.text_to_search,
        count: config.count_to_search,
        offset: 1,
        version: 5.62
    });

    return chain.execute();

}).then((data) => {

    documents = data[0].items;

}).then(() => {

    documents.map((doc, index) => {
        
       var time = new Date().getTime();
        if( doc.size > size.from && doc.size <= size.to && config.exts.indexOf(doc.ext) != -1 ) {

            var newDocName = `${dest_save}${index}_${time}_${doc.title}`;

            if(newDocName.length > 50) {
                newDocName = newDocName.slice(0 , 45) + '.' + doc.ext;
            }
    
            download( doc.url, newDocName, () => {
                console.log(`${newDocName} downloaded`);
            } );
    
        } 
        
    });
    
})
.catch((error) => {
    console.error(error);
    logError(error);
});

var download = function(url, dest, cb) {
    var file = fs.createWriteStream(dest);
    var sendReq = request.get(url);

    // verify response code
    sendReq.on('response', function(response) {
        if (response.statusCode !== 200) {
            return cb('Response status was ' + response.statusCode);
        }
    });

    // check for request errors
    sendReq.on('error', function (err) {
        fs.unlink(dest);
        logError(err.message);
        return cb(err.message);
    });

    sendReq.pipe(file);

    file.on('finish', function() {
        file.close(cb);  // close() is async, call cb after close completes.
    });

    file.on('error', function(err) { // Handle errors
        fs.unlink(dest); // Delete the file async. (But we don't check the result)
        logError(err.message);
        return cb(err.message);
    });
};

app.listen(port);
console.log("server started on port " + port);