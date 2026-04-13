export default async function handler(req, res) {
  // Allow CORS from our own app
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { rollNo, dob, session } = req.body
  if (!rollNo || !dob || !session) return res.status(400).json({ error: 'Missing fields' })

  const BASE = 'https://results.bput.ac.in'
  const headers = {
    'accept': '*/*',
    'content-type': 'application/json; charset=utf-8',
    'origin': 'https://results.bput.ac.in',
    'referer': 'https://results.bput.ac.in/',
    'x-requested-with': 'XMLHttpRequest',
  }

  try {
    // Step 1 — get summary + semId
    const summaryRes = await fetch(
      `${BASE}/student-results-list?rollNo=${encodeURIComponent(rollNo)}&dob=${encodeURIComponent(dob)}&session=${encodeURIComponent(session)}`,
      { method: 'POST', headers }
    )
    const summary = await summaryRes.json()
    if (!summary || summary.length === 0) return res.status(404).json({ error: 'Result not found. Please check roll number or try a different session.' })

    // Sort by semId and pick the LAST one (latest semester)
    // Back paper results appear first — actual sem result is last
    summary.sort((a, b) => parseInt(a.semId) - parseInt(b.semId))
    const latest = summary[summary.length - 1]
    const semId = latest.semId
    const latestSession = latest.examSession

    // Step 2 — get subjects + SGPA
    const subjectsRes = await fetch(
      `${BASE}/student-results-subjects-list?semid=${semId}&rollNo=${encodeURIComponent(rollNo)}&session=${encodeURIComponent(latestSession)}`,
      { method: 'POST', headers }
    )
    const subjectsData = await subjectsRes.json()

    return res.status(200).json({
      summary: latest,
      grades:  subjectsData.grades  || [],
      sgpa:    subjectsData.sgpadetails || {},
    })
  } catch (e) {
    console.error('BPUT API error:', e)
    return res.status(500).json({ error: 'Failed to fetch result. BPUT server may be down.' })
  }
}