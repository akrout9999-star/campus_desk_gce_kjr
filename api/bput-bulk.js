export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { rollNumbers, session } = req.body
  if (!rollNumbers || !session) return res.status(400).json({ error: 'Missing fields' })

  const BASE = 'https://results.bput.ac.in'
  const headers = {
    'accept': '*/*',
    'content-type': 'application/json; charset=utf-8',
    'origin': 'https://results.bput.ac.in',
    'referer': 'https://results.bput.ac.in/',
    'x-requested-with': 'XMLHttpRequest',
  }

  const fetchOne = async ({ rollNo, name }) => {
    try {
      const summaryRes = await fetch(
        `${BASE}/student-results-list?rollNo=${encodeURIComponent(rollNo)}&dob=2000-01-01&session=${encodeURIComponent(session)}`,
        { method: 'POST', headers }
      )
      const summary = await summaryRes.json()
      if (!summary || summary.length === 0) return { rollNo, name, sgpa: null, error: 'Not found' }

      // Sort by semId and pick the LAST one (latest semester)
      // Back paper results appear first — actual sem result is last
      summary.sort((a, b) => parseInt(a.semId) - parseInt(b.semId))
      const latest = summary[summary.length - 1]
      const semId = latest.semId
      const latestSession = latest.examSession

      const subjectsRes = await fetch(
        `${BASE}/student-results-subjects-list?semid=${semId}&rollNo=${encodeURIComponent(rollNo)}&session=${encodeURIComponent(latestSession)}`,
        { method: 'POST', headers }
      )
      const subjectsData = await subjectsRes.json()
      const sgpa = subjectsData.sgpadetails?.sgpa ?? null

      // Return summary so frontend can show semester/branch info
      return { rollNo, name, sgpa, summary: latest }
    } catch {
      return { rollNo, name, sgpa: null, error: 'Failed' }
    }
  }

  try {
    const results = []
    const batchSize = 5
    for (let i = 0; i < rollNumbers.length; i += batchSize) {
      const batch = rollNumbers.slice(i, i + batchSize)
      const batchResults = await Promise.all(batch.map(fetchOne))
      results.push(...batchResults)
    }
    return res.status(200).json({ results })
  } catch (e) {
    console.error('Bulk fetch error:', e)
    return res.status(500).json({ error: 'Bulk fetch failed.' })
  }
}