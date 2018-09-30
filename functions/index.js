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
exports.reqOrder = functions.https.onRequest((req, res) => {
    const request = req.body.events[0];
    if (request.message.type !== 'text' || request.source.type !== 'group') {
        return;
    }
    // const data = initMsg(request.message.text);
    const data = Object.assign(...request.message.text.split('#').filter(f => f != "")
        .map(m => {
            const dontReplces = ["name", "fb", "bank", "addr"];
            const key = m.split(':')[0];
            let value = m.split(':')[1];
            if (!dontReplces.includes(key)) value = value.replace(/\s/g, '');
            if (key !== 'addr') value = value.replace(/\n/g, '');
            if (key == 'tel') value = value.replace(/\D/g, ''); //เหลือแต่ตัวเลข
            if (key !== 'price') {
                value = value.trim();
                if (key == 'product') {
                    value = value.split(',').map(p => {
                        return {
                            code: p.split('=')[0],
                            amount: Number(p.split('=')[1])
                        }
                    });
                }
            } else {
                value = Number(value);
            }
            return { [key]: value };
        }));
    const text = `รายการสั่งซื้อของคุณคือ
    คุณ ${data.name} ${data.tel}
    ที่อยู่: ${data.addr}
    สินค้า: ${data.product.map(p => p.code + ' จำนวน ' + p.amount + 'ชิ้น ')}
    ธนาคาร: ${data.bank} จำนวนเงิน ${data.price}
    FB: ${data.fb}
    `
    const obj = {
        replyToken: request.replyToken,
        text
    };

    reply2(obj);
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
const reply2 = (obj) => {
    return request({
        method: `POST`,
        uri: `${LINE_MESSAGING_API}/reply`,
        headers: LINE_HEADER,
        body: JSON.stringify({
            replyToken: obj.replyToken,
            messages: [
                {
                    type: `text`,
                    text: obj.text
                }
            ]
        })
    });
};
const initMsg = (txt) => {
    return Object.assign(...txt.split('#').filter(f => f != "")
        .map(m => {
            const dontReplces = ["name", "fb", "bank", "addr"];
            const key = m.split(':')[0];
            let value = m.split(':')[1];
            if (!dontReplces.includes(key)) value = value.replace(/\s/g, '');
            if (key !== 'addr') value = value.replace(/\n/g, '');
            if (key == 'tel') value = value.replace(/\D/g, ''); //เหลือแต่ตัวเลข
            if (key !== 'price') {
                value = value.trim();
                if (key == 'product') {
                    value = value.split(',').map(p => {
                        return {
                            code: p.split('=')[0],
                            amount: Number(p.split('=')[1])
                        }
                    });
                }
            } else {
                value = Number(value);
            }
            return { [key]: value };
        }));
}