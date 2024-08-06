const http = require('http');
http.createServer(function (req, res) {
    res.write("Check coupon the golden spoon");
    res.end();
}).listen(8080);