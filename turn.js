import express from 'express';
export default function turn({
  CLOUDFLARE_ACCOUNT_ID,
  CLOUDFLARE_AUTH_TOKEN
}){
  const router = express.Router();
  router.get('/', async (req, res) => {
    try {
      const response = await fetch(
        `https://rtc.live.cloudflare.com/v1/turn/keys/${CLOUDFLARE_ACCOUNT_ID}/credentials/generate`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${CLOUDFLARE_AUTH_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ ttl: 86400 }) // TTL en segundos (24 horas)
        }
      );
      if (!response.ok) { throw new Error(`HTTP error! status: ${response.status}`);}
      const turnCredentials = await response.json();
      res.json(turnCredentials);
    } catch (error) {
      console.error('Error al obtener las credenciales TURN:', error);
      res.status(500).json({ error: 'Error al obtener las credenciales TURN' });
    }
  });

  return router;
}