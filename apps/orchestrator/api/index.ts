export const config = {
  runtime: 'nodejs',
  maxDuration: 60,
};

export default function handler(req: any, res: any) {
  res.status(200).json({ status: 'ok', service: 'lumiads-orchestrator', path: req.url });
}
