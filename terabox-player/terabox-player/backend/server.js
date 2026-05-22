const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const API_KEY = 'anshapi';
const API_BASE = 'https://ansh-apis.is-dev.org/api/teraboxapi';

app.get('/api/terabox', async (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ success: false, error: 'URL is required' });
  }

  try {
    const response = await axios.get(API_BASE, {
      params: { key: API_KEY, url },
      timeout: 15000,
    });

    res.json(response.data);
  } catch (err) {
    const status = err.response?.status || 500;
    res.status(status).json({
      success: false,
      error: err.response?.data?.message || err.message || 'Failed to fetch video',
    });
  }
});

app.listen(PORT, () => {
  console.log(`TeraBox API server running on http://localhost:${PORT}`);
});
