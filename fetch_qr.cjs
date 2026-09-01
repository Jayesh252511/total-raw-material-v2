const http = require('http');
const fs = require('fs');
const path = require('path');

http.get('http://13.60.182.209:3000', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const match = data.match(/src="(data:image\/png;base64,[^"]+)"/);
    if (match && match[1]) {
      const base64Data = match[1].replace(/^data:image\/png;base64,/, '');
      const outDir = path.join(__dirname, 'scratch');
      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
      const imgPath = path.join(outDir, 'aws_qr.png');
      fs.writeFileSync(imgPath, Buffer.from(base64Data, 'base64'));
      console.log('SUCCESS: Saved AWS QR image to:', imgPath);
    } else {
      console.log('QR image not ready yet on server. Response HTML length:', data.length);
    }
  });
}).on('error', console.error);
