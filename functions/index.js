const functions = require('firebase-functions');
const request = require('request-promise');
var admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);
var db = admin.firestore();
const LINE_MESSAGING_API = 'https://api.line.me/v2/bot/message';
const LINE_HEADER = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer H+Um79B9DkzqrE/LDPIMxAZ8thwdUe6rFGtzjBiVfx0jbOWh5vCVLgaOIW+BZ78ulZIfjKNk0gK3XH2tW3KpPJgpt77SdnVohNXWTFtVZiDIJBGmzmOjyybjOLCCOtqKbbH6CIyKv/Wdn+O3xW0BVwdB04t89/1O/w1cDnyilFU=`
};

exports.LineBot = functions.https.onRequest((req, res) => {
    // if (req.body.events[0].message.type !== 'text') {
    //     return;
    // }
    const userId = req.body.events[0].source.userId;
    const userRef = db.collection('users').doc(userId);
    userRef.get()
        .then(user => {
            if (!user.exists) {
                userRef.set({
                    count_orders: 1
                })
            } else {
                userRef.set({
                    count_orders: user.data().count_orders + 1
                })
            }
        })
    reply(req.body);
});
const reply = (bodyResponse) => {
    return request({
        method: `POST`,
        uri: `${LINE_MESSAGING_API}/reply`,
        headers: LINE_HEADER,
        body: JSON.stringify({
            replyToken: bodyResponse.events[0].replyToken,
            messages: [
                {
                    type: `text`,
                    text: bodyResponse.events[0].message.text
                },
                {
                    type: `text`,
                    text: JSON.stringify(bodyResponse)
                }
            ]
        })
    });
};
