# Daikin – Schedule Release

Standalone React app. Runs on **http://localhost:5175**.

```bash
npm install
npm run dev
```

- Sample data: `src/data/mockData.js`
- Replace with real API calls in `src/services/api.js`
- Portal URL for the "Back to Portal" link: `VITE_PORTAL_URL` in `.env` (see `.env.example`)

## SAP backend (OData)

| Screen | CDS view |
|---|---|
| Left sidebar — agreement list | `ZCDS_SCHDULEAGR_HEAD` (plant taken from the items) |
| Right side — items of the agreement | `ZCDS_SCHDULEAGR_ITEM` (+ totals from the schedule lines) |
| Line-item page — schedule lines | `ZCDS_SCHEDULEAGR_SCH` |

- Code: `src/services/Schedulerelease.js` (live) and `src/services/SchedulereleaseMock.js` (mock).
  The pages use the same functions either way.
- **Data source:** `npm run dev` uses mock data; the deployed build uses SAP.
  Override with `VITE_USE_MOCK=true|false` in `.env`.
- **Service binding:** `/sap/opu/odata/sap/ZSB_PURCAHSE` by default — change it in
  `src/services/sapOData.js` (or `VITE_SR_ODATA_SERVICE`) if the views are in another binding.
- On BTP, `/sap/...` goes through the approuter to the **`Supplier-Portal`** destination
  (`approuter/xs-app.json`, `mta.yaml`), same as Purchase Order.
- Not in SAP yet: supplier confirmation (items show "Confirmation Required", the Confirm
  button reports it isn't connected), HSN code and plant name.
