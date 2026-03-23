export const config = {
  runtime: 'nodejs',
  maxDuration: 60,
};

export default function handler(req, res) {
  res.status(200).json({ status: 'ok', service: 'lumiads-orchestrator', path: req.url });
}
