const jwt = require('jsonwebtoken');

exports.handler = async (event) => {
  try {
    const { licenseKey } = JSON.parse(event.body);
    const decoded = jwt.verify(licenseKey, process.env.JWT_SECRET);

    if (decoded.typ !== 'year_pass') {
      throw new Error('Invalid license type');
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ valid: true }),
    };
  } catch (err) {
    return {
      statusCode: 200,
      body: JSON.stringify({ valid: false }),
    };
  }
};
