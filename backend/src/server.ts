import express from 'express'

const app = express()

const PORT = process.env.PORT || 8080

app.use(express.json())

app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'ibm-rcs-backend',
  })
})

app.get('/api/reports/:caseId', (req, res) => {
  res.status(200).json({
    case_id: req.params.caseId,
    status: 'Being Reviewed',
  })
})

app.post('/api/auditor/cases/:caseId/decline', (req, res) => {
  res.status(200).json({
    case_id: req.params.caseId,
    status: 'Declined',
    routed_to: 'Manager Queue',
  })
})

app.get('/api/manager/dashboard', (_req, res) => {
  res.status(200).json({
    auditors: [],
    pending_declined_cases: 0,
  })
})

app.listen(PORT, () => {
  console.log(`IBM RCS backend running on port ${PORT}`)
})