const functions = require('firebase-functions');
const request = require('request-promise');
var admin = require('firebase-admin');
// var moment = require('moment');
admin.initializeApp(functions.config().firebase);
var db = admin.firestore();
const LINE_MESSAGING_API = 'https://api.line.me/v2/bot/message';
const LINE_HEADER = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer H+Um79B9DkzqrE/LDPIMxAZ8thwdUe6rFGtzjBiVfx0jbOWh5vCVLgaOIW+BZ78ulZIfjKNk0gK3XH2tW3KpPJgpt77SdnVohNXWTFtVZiDIJBGmzmOjyybjOLCCOtqKbbH6CIyKv/Wdn+O3xW0BVwdB04t89/1O/w1cDnyilFU=`
};

// exports.LineBot = functions.https.onRequest((req, res) => {
// if (req.body.events[0].message.type !== 'text') {
//     return;
// }
// const userId = req.body.events[0].source.userId;
// const userRef = db.collection('users').doc(userId);
// userRef.get()
//     .then(user => {
//         if (!user.exists) {
//             userRef.set({
//                 count_orders: 1
//             })
//         } else {
//             userRef.set({
//                 count_orders: user.data().count_orders + 1
//             })
//         }
//     })
// reply(req.body);
// });
exports.reqOrder = functions.https.onRequest((req, res) => {
    const request = req.body.events[0];
    const msg = request.message.text;
    const userId = request.source.userId;
    const userRef = db.collection('admins').doc(userId);
    let obj = {
        replyToken: request.replyToken,
        messages: []
    };
    // if (request.message.type !== 'text' || request.source.type !== 'group') {
    if (msg.indexOf('@@admin=') > -1 && msg.split('=').length == 2) {
        userRef.set({
            userId,
            name: msg.split('=')[1],
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        })
            .then(admin => {
                obj.messages.push({
                    type: 'text',
                    text: `ลงทะเบียน ${msg.split('=')[1]} เป็น Admin เรียบร้อยค่ะ`
                })
                // obj.messages.push({
                //     type: 'sticker',
                //     packageId: '11538',
                //     stickerId: '51626498'
                // })
                reply2(obj);
            })
    } else {
        userRef.get()
            .then(user => {
                if (user.exists) {
                    if (request.source.type == 'group') {
                        if (msg.indexOf('@@ยกเลิก=') > -1 && msg.split('=').length == 2) {
                            const orderId = msg.split('=')[1];
                            const orderRef = db.collection('orders').doc(orderId);
                            orderRef.get()
                                .then(order => {
                                    if (order.exists) {
                                        if (order.data().cutoff) {
                                            obj.messages.push({
                                                type: 'text',
                                                text: `ไม่สามารถยกเลิกรายการสั่งซื้อ ${orderId}\nเนื่องจากได้ทำการตัดรอบไปแล้วค่ะ`
                                            })
                                            reply2(obj);
                                        } else {
                                            orderRef.delete()
                                                .then(cancel => {
                                                    obj.messages.push({
                                                        type: 'text',
                                                        text: `ยกเลิกรายการสั่งซื้อ ${orderId} เรียบร้อยค่ะ${formatOrder(order.data())}`
                                                    })
                                                    reply2(obj);
                                                })
                                        }
                                    } else {
                                        obj.messages.push({
                                            type: 'text',
                                            text: `ไม่มีรายการสั่งซื้อนี้: ${orderId}\nกรุณาตรวจสอบ "รหัสสั่งซื้อ" ค่ะ`
                                        })
                                    }
                                    reply2(obj);
                                })
                        } else if (msg.indexOf('#') > -1) {
                            const resultOrder = initMsgOrder(msg);
                            if (resultOrder.success) {
                                db.collection('counter').doc('orders').get()
                                    .then(counts => {
                                        const countsData = counts.data();
                                        let no = 1;
                                        if (countsData.date == yyyymmdd()) {
                                            no = countsData.no + 1;
                                        }
                                        db.collection('counter').doc('orders').set({ date: yyyymmdd(), no })
                                        const orderId = yyyymmdd() + '-' + fourDigit(no);
                                        db.collection('orders').doc(orderId)
                                            .set(Object.assign({ userId, admin: user.data().name, cutoff: false, timestamp: admin.firestore.FieldValue.serverTimestamp() }, resultOrder.data))
                                            .then(order => {
                                                obj.messages.push({
                                                    type: 'text',
                                                    text: `รหัสสั่งซื้อ: ${orderId}\n ${resultOrder.text}\nยกเลิกรายการให้พิมพ์ข้อความด้านล่างนี้ค่ะ`
                                                })
                                                obj.messages.push({
                                                    type: 'text',
                                                    text: `@@ยกเลิก=${orderId}`
                                                })
                                                reply2(obj);
                                            })
                                    })

                            } else {
                                obj.messages.push({ type: `text`, text: resultOrder.text })
                                reply2(obj);
                            }
                        }
                    } else {
                        obj.messages.push({
                            type: 'text',
                            text: `คุยในกลุ่มดีกว่านะคะ`
                        })
                        reply2(obj);
                    }
                } else {
                    return;
                }
            })
    }
    // }



});
const reply2 = (obj) => {
    return request({
        method: `POST`,
        uri: `${LINE_MESSAGING_API}/reply`,
        headers: LINE_HEADER,
        body: JSON.stringify({
            replyToken: obj.replyToken,
            messages: obj.messages
        })
    });
};
const initMsgOrder = (txt) => {
    const data = Object.assign(...txt.split('#').filter(f => f != "")
        .map(m => {
            if (m.split(':').length == 2) {
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
                            if (p.split('=').length == 2) {
                                return {
                                    code: p.split('=')[0],
                                    amount: Number(p.split('=')[1].replace(/\D/g, ''))
                                }
                            } else {
                                return {
                                    code: 'รหัสสินค้า',
                                    amount: 'undefined'
                                }
                            }
                        });
                    }
                } else {
                    value = Number(value.replace(/\D/g, ''));
                }
                return { [key]: value };
            }
        }));
    let text = formatOrder(data);
    const indexUndefined = text.indexOf('undefined');
    let success = true;
    if (indexUndefined > -1) {
        const t = text.substring(0, indexUndefined - 1).split(' ');
        text = 'รายการสั่งของคุณไม่ถูกต้องค่ะ กรุณาตรวจสอบ "' + t[t.length - 1] + '"';
        success = false;
    }
    return { text, success, data };
}
const formatOrder = (data) => {
    return `
    ชื่อ: ${data.name} เบอร์โทร: ${data.tel}
    ที่อยู่: ${data.addr}
    สินค้า: ${data.product
            ? data.product.map((p, i) => '\n' + p.code + ' ' + p.amount + 'ชิ้น')
            : 'undefined'}
    ธนาคาร: ${data.bank} จำนวนเงิน: ${data.price ? formatMoney(data.price) : 'undefined'}
    FB: ${data.fb}
    Page: ${data.page}
    `;
}
const formatMoney = (amount, decimalCount = 2, decimal = ".", thousands = ",") => {
    try {
        decimalCount = Math.abs(decimalCount);
        decimalCount = isNaN(decimalCount) ? 2 : decimalCount;

        const negativeSign = amount < 0 ? "-" : "";

        let i = parseInt(amount = Math.abs(Number(amount) || 0).toFixed(decimalCount)).toString();
        let j = (i.length > 3) ? i.length % 3 : 0;

        return negativeSign + (j ? i.substr(0, j) + thousands : '') + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + thousands) + (decimalCount ? decimal + Math.abs(amount - i).toFixed(decimalCount).slice(2) : "");
    } catch (e) {
        console.log(e)
    }
};

const yyyymmdd = () => {
    function twoDigit(n) { return (n < 10 ? '0' : '') + n; }
    var now = new Date();
    return '' + now.getFullYear() + twoDigit(now.getMonth() + 1) + twoDigit(now.getDate());
}

const fourDigit = (n) => {
    if (n < 10) {
        return '000' + n.toString();
    } else if (n < 100) {
        return '00' + n.toString();
    } else if (n < 1000) {
        return '0' + n.toString()
    } else {
        return n.toString();
    }
}