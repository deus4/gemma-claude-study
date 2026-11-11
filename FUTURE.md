# Possible next steps (not part of the current study)

The current study asks one question on a laptop: can a local model keep personal data and know-how out of a
cloud model and still get good answers? If the answer is useful, the same idea scales in two directions:
**down** to devices and **up** to businesses. These are hypotheses, written down so they are not lost.
Nothing here has been built or tested.

## 1. One idea, several tiers
| Tier | Where the gate runs | Realistic model | Example |
|---|---|---|---|
| Device | microcontroller (e.g. ESP32) | no LLM: rules + a tiny classifier (TinyML) | a smart scale, a thermostat, a food-chain sensor |
| Robot / drone | onboard computer next to the sensors | small model on the companion computer | camera, sonar and telemetry from a ground robot, drone or surface vessel |
| Gateway / home hub | single-board computer, router, hub | small language model (1–4B) | a bar's iPad or hub, a home hub |
| Personal | laptop | Gemma 4 12B (this study) | one professional's own work |
| Business | on-premises or EU-hosted servers | large open-weight model, e.g. Mistral Large 4 | a company's private "first reader" |
| Frontier | cloud | Claude | the hard part of the task, on redacted input only |

The rule at every tier stays the same as in the study: a model **suggests** what is sensitive, plain code
**swaps** it for placeholders and back, and only the redacted request leaves the tier.

## 2. Down: IoT devices and gateways
- IoT has historically been weak on security. A gate at the edge turns "the device sends everything to the
  cloud" into "the device sends only what it must, redacted, and logs what it sent".
- Microcontrollers cannot run a language model; the realistic split is rules and a tiny classifier on the
  device, a small model on the gateway, and a frontier model only for rare, hard cases.
- Questions to test: how small can the gate model be before leakage rises sharply? What is the
  energy and latency cost per message? Can the gateway also check what comes **back** from the cloud
  (prompt injection, unsafe commands to actuators)?
- Robots and drones are IoT too: their sensors (cameras, sonar, telemetry) produce the most sensitive data
  and often work with weak or jammed links, so deciding on board what may leave matters even more.
- Starting point from the author's own work: Getti's Bluetooth scales (ESP32) and iPad app, where the
  gateway already exists.

## 3. Up: businesses, EU-hosted
- Mistral Large 4 (open weights since 29 Oct 2026, ~1T parameters, mixture of experts) needs a multi-GPU
  server, so it fits a company or an EU host, not a laptop. Its licence has conditions for hosting it as a
  service; read it before any commercial use.
- Question to test: does a much larger local gate close the gaps a 12B model leaves (know-how, indirect
  identifiers), and is the cost worth it compared with rules + a small model?

## 4. Why the EU is the natural place for this
Not legal advice; dates to verify before citing.
- **GDPR:** pseudonymisation (Art. 4(5), 25, 32) and the 2025 CJEU ruling EDPS v SRB, under which
  pseudonymised data may not be personal data for a recipient that cannot re-identify it. A gate's
  re-identification rate is the evidence for or against that.
- **Data Act** (applies since 12 Sep 2025): rules on access to data from connected products.
- **Cyber Resilience Act:** security duties for products with digital elements; reporting duties from
  Sep 2026, most duties from Dec 2027.
- **Radio Equipment Directive** cybersecurity rules for connected radio devices (since Aug 2025).
- **AI Act** (as amended by the Digital Omnibus, in force 27 Jul 2026): high-risk duties from Dec 2027 /
  Aug 2028; a gate may matter more once a pipeline touches a high-risk area.
- Sector rules add their own data duties, from food traceability (farm to shelf) to health data.

## 5. Not now
The current study is deliberately narrow: one laptop model, synthetic data, one frontier model. The ideas
above only make sense if its results show the gate works at the personal tier first.
