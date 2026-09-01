/**
 * AWS EC2 24/7 Automated Deployment Script
 * Launches an Ubuntu 22.04 LTS instance, installs Node.js + PM2,
 * clones the repo, and runs the WhatsApp Bot 24/7 in the AWS Cloud.
 */

const { EC2Client, RunInstancesCommand, CreateSecurityGroupCommand, AuthorizeSecurityGroupIngressCommand, DescribeInstancesCommand } = require('@aws-sdk/client-ec2');

async function deployToAWS(accessKeyId, secretAccessKey, region = 'ap-south-1') {
  console.log(`🚀 Connecting to AWS Region: ${region}...`);
  const ec2 = new EC2Client({
    region,
    credentials: { accessKeyId, secretAccessKey }
  });

  // User Data script that runs on EC2 startup automatically
  const userDataScript = `#!/bin/bash
exec > /var/log/user-data.log 2>&1
echo "Starting 24/7 WhatsApp Bot Setup..."

# Update system & install Node.js 20 & Git
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get update -y
apt-get install -y nodejs git build-essential

# Install PM2 for 24/7 process management
npm install -g pm2

# Clone repo & setup
mkdir -p /opt/app
cd /opt/app
git clone https://github.com/Jayesh252511/total-raw-material-v2.git repo
cd repo

# Install dependencies
npm install

# Start bot with PM2 (Auto-restarts if crashes / server reboots)
pm2 start whatsapp-bot-baileys.cjs --name "whatsapp-bot"
pm2 save
pm2 startup

echo "Setup complete! Bot is running 24/7 on PM2!"
`;

  const userDataBase64 = Buffer.from(userDataScript).toString('base64');

  // Security group setup
  const sgName = `whatsapp-bot-sg-${Date.now()}`;
  let groupData;
  try {
    groupData = await ec2.send(new CreateSecurityGroupCommand({
      GroupName: sgName,
      Description: 'Security group for WhatsApp Bot 24/7 web server',
    }));
    console.log(`🔒 Created Security Group: ${groupData.GroupId}`);

    // Open ports 80, 3000, 22
    await ec2.send(new AuthorizeSecurityGroupIngressCommand({
      GroupId: groupData.GroupId,
      IpPermissions: [
        { IpProtocol: 'tcp', FromPort: 80, ToPort: 80, IpRanges: [{ CidrIp: '0.0.0.0/0' }] },
        { IpProtocol: 'tcp', FromPort: 3000, ToPort: 3000, IpRanges: [{ CidrIp: '0.0.0.0/0' }] },
        { IpProtocol: 'tcp', FromPort: 22, ToPort: 22, IpRanges: [{ CidrIp: '0.0.0.0/0' }] },
      ]
    }));
  } catch (err) {
    console.log('Security group info:', err.message);
  }

  // Common Ubuntu 22.04 LTS AMIs per region
  const amiMap = {
    'eu-north-1': 'ami-0a852fb2d1e35922f', // Stockholm
    'ap-south-1': 'ami-0c2af51e265bd5e0e', // Mumbai
    'us-east-1': 'ami-0c7217cdde317cfec',  // N. Virginia
    'us-west-2': 'ami-008fe2fc65df48dac',  // Oregon
    'eu-west-1': 'ami-0d70546e43a941d70'   // Ireland
  };
  const imageId = amiMap[region] || amiMap['eu-north-1'];
  const instanceType = region === 'eu-north-1' ? 't3.micro' : 't2.micro';

  console.log(`📦 Launching AWS EC2 ${instanceType} Instance (${region})...`);
  const runParams = {
    ImageId: imageId,
    InstanceType: instanceType,
    MinCount: 1,
    MaxCount: 1,
    UserData: userDataBase64,
    ...(groupData?.GroupId ? { SecurityGroupIds: [groupData.GroupId] } : {}),
    TagSpecifications: [{
      ResourceType: 'instance',
      Tags: [{ Key: 'Name', Value: 'WhatsApp-Bot-247' }]
    }]
  };

  const runResult = await ec2.send(new RunInstancesCommand(runParams));
  const instanceId = runResult.Instances[0].InstanceId;
  console.log(`✅ EC2 Instance Created! ID: ${instanceId}`);
  console.log(`⏳ Waiting for public IP assignment (approx 15 seconds)...`);

  let publicIp = null;
  for (let i = 0; i < 10; i++) {
    await new Promise(r => setTimeout(r, 4000));
    const desc = await ec2.send(new DescribeInstancesCommand({ InstanceIds: [instanceId] }));
    publicIp = desc.Reservations?.[0]?.Instances?.[0]?.PublicIpAddress;
    if (publicIp) break;
  }

  console.log(`\n🎉 DEPLOYMENT COMPLETE!`);
  console.log(`--------------------------------------------------`);
  console.log(`📍 AWS EC2 Public IP: ${publicIp}`);
  console.log(`🌐 Web & Pairing URL: http://${publicIp}:3000`);
  console.log(`--------------------------------------------------\n`);

  return { instanceId, publicIp, url: `http://${publicIp}:3000` };
}

module.exports = { deployToAWS };

if (require.main === module) {
  const keyId = process.env.AWS_ACCESS_KEY_ID;
  const secretKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.AWS_REGION || 'ap-south-1';
  if (!keyId || !secretKey) {
    console.error('Please provide AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY');
    process.exit(1);
  }
  deployToAWS(keyId, secretKey, region).catch(console.error);
}
