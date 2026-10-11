# India recycling and disposal guidance

Re-Intent's India guidance is based on the government sources listed below. User-facing India claims are checked against government publications before they are added to `backend/data/guidance.json`. Collection acceptance remains a local decision.

## Current routing

1. Safety properties such as hazardous, oil or chemical residue, and sharp or broken take precedence.
2. Specific item and condition rules in `backend/data/recycle-rules.json` provide the preparation and disposal step. `Contaminated` means dirty or unusable; the app does not ask what is on the item. A separate oil or chemical residue property provides more cautious advice.
3. Specialist item guidance handles batteries, lamps, electronics and organic waste. General material rules do not override these routes.
4. Where an India entry exists, `backend/data/guidance.json` supplies a source-backed national sorting or collection note. The app does not claim to know which municipal bin or recycler accepts an item in a free-text city.
5. `backend/src/disposal-step.js` adds a short `nextStep` to every recycle/dispose result. It tells users the likely collection route first, while the longer advice and official source links remain below. A dirty paper cup says to use local non-recyclable waste, not the paper recycling bin, unless a local used-cup collection exists.

## Government sources reviewed 2026-10-11

- [Solid Waste Management Rules, 2026 announcement](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2219676&lang=2&reg=48): the 2026 rules replaced the 2016 rules on 1 April 2026. They establish separate wet, dry, sanitary and special-care streams. Dry-stream segregation does not establish that every item can be recycled locally.
- [Battery Waste Management Rules, 2022](https://moef.gov.in/uploads/pdf-uploads/pdf_676567459cdfe9.16099796.pdf): batteries have a separate waste-management route.
- [E-Waste (Management) Rules, 2022](https://moef.gov.in/uploads/2022/11/E-Waste-Management-Rules-2022.pdf): listed electrical and electronic equipment has a separate e-waste route.
- [Government clarification on identified single-use plastics](https://www.pib.gov.in/Pressreleaseshare.aspx?PRID=1942104&lang=2&reg=48): the 120-micron restriction concerns plastic carry bags, while the prohibition names particular single-use products. Neither rule determines the disposal route of an existing bottle.

## Claims from the checklist intentionally excluded

The app does not say that every foam food container is banned, all metal foil is accepted for recycling, only bottle glass can be recycled, or every chemical bottle should be triple-rinsed. These claims are too broad to turn into household instructions. The app also does not prescribe a sand bucket for a damaged battery or assume a specific local collection service exists.

Producer targets, penalties and EPR certificate trading are omitted from item results because they do not tell an individual user how to handle an item. The list of registered **producers** is not presented as a list of recycling drop-off locations.
