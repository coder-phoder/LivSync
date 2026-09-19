const test = require('node:test');
const assert = require('node:assert');
const { driveFolderId, toMedia } = require('./controllers/listing.controller');

test('a shared Drive folder link gives up its id in either shape', () => {
    assert.strictEqual(driveFolderId('https://drive.google.com/drive/folders/1a2b3c4d5e6f7g'), '1a2b3c4d5e6f7g');
    assert.strictEqual(driveFolderId('https://drive.google.com/drive/u/0/folders/1a2b3c4d5e6f7g?usp=sharing'), '1a2b3c4d5e6f7g');
    assert.strictEqual(driveFolderId('https://drive.google.com/file/d/1a2b3c4d5e6f7g/view'), '');
    assert.strictEqual(driveFolderId(''), '');
});

test('only the images and videos in the folder become listing media', () => {
    const media = toMedia([
        { id: 'img1', name: 'living-room.jpg', mimeType: 'image/jpeg' },
        { id: 'clip1', name: 'walkthrough.mov', mimeType: 'video/quicktime' },
        { id: 'doc1', name: 'agreement.pdf', mimeType: 'application/pdf' },
        { id: 'sub1', name: 'more photos', mimeType: 'application/vnd.google-apps.folder' },
    ]);

    assert.deepStrictEqual(media.map((item) => item.id), ['img1', 'clip1']);
    assert.strictEqual(media[0].kind, 'image');
    assert.strictEqual(media[0].src, 'https://drive.google.com/thumbnail?id=img1&sz=w1600');
    assert.strictEqual(media[1].kind, 'video');
    assert.strictEqual(media[1].src, 'https://drive.google.com/file/d/clip1/preview');
    assert.strictEqual(media[1].poster, 'https://drive.google.com/thumbnail?id=clip1&sz=w800');
});

test('an empty or malformed folder listing yields no media', () => {
    assert.deepStrictEqual(toMedia(), []);
    assert.deepStrictEqual(toMedia([{ id: 'x', name: 'x' }]), []);
});
