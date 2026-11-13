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

## 2b. Gate size: other Gemma 4 models (hypotheses, not tested)
The study used only Gemma 4 12B, the largest that runs well on the author's laptop (M2 Pro, 16 GB). Gemma 4
also comes in four core sizes, which map onto the tiers above:
| Model | Fits | Hypothesis |
|---|---|---|
| E2B | phone, hub, robot companion computer | catches pattern-like personal data with rules; misses more names and almost all know-how |
| E4B | hub, gateway, tablet | close to 12B on personal data; weaker on client names and know-how |
| 26B A4B (mixture of experts) | workstation, small office server | fewer know-how leaks than 12B at similar speed |
| 31B (dense) | workstation, office server | the best of the family as a gate; still misses know-how written as code identifiers |
- Test: the same 30 tasks, arms G and RG with each model as the gate; the curve of leakage against model
  size, and time per task, answers "how small can the gate be" for each tier.
- Expectation from v1: rules stay necessary at every size (they catch what models miss, e.g. e-mails), and
  know-how in code is the hardest case for every size. Fixing it may need a code-aware step (marking
  identifiers defined near secret constants) rather than a bigger model.

## 3. Up: businesses, EU-hosted
- Mistral Large 4 (open weights since 29 Oct 2026, ~1T parameters, mixture of experts) needs a multi-GPU
  server, so it fits a company or an EU host, not a laptop. Its licence has conditions for hosting it as a
  service; read it before any commercial use.
- Question to test: does a much larger local gate close the gaps a 12B model leaves (know-how, indirect
  identifiers), and is the cost worth it compared with rules + a small model?

## 3b. Verifiable gates: zero-knowledge principles (hypotheses, not tested)
Zero-knowledge (ZK) proofs show that a statement about secret data is true without revealing the data.
They do **not** let a cloud model work on data it cannot see (only homomorphic encryption or multi-party
computation hide data from the computation itself; a trusted execution environment hides it from the
operator, not from the model, see 3c), and they do not stop inference from what is sent. Where they could help is **proving the gate did its job**:
- **Commitments to the placeholder map (cheap, buildable now):** before sending, the gate publishes a hash
  commitment (e.g. a Merkle root) of every `placeholder → value` pair. Later, for an audit or a dispute,
  one pair can be revealed and checked against the root without revealing the others. Gives a tamper-
  evident record of what was hidden and what was sent.
- **Proof that the rules ran (feasible with a zkVM):** the device proves "the sent text is the output of
  redaction policy P applied to some input", without showing the input. Realistic for the pattern rules;
  useful for IoT devices and for GDPR accountability (Art. 5(2): being able to *demonstrate* compliance).
- **Proof that the model gate ran (not practical yet):** proving the inference of a 12B model in ZK is far
  too expensive today; small classifiers on devices may become provable first.
- **Send proofs instead of attributes (data minimisation):** when the cloud only needs a fact ("this person
  is over 18", "this employee belongs to venue X"), send a ZK proof of the fact, not the personal data; the
  same idea as selective disclosure in the EU Digital Identity Wallet.
- Limit: a proof shows the policy ran, not that the policy is good. Leakage and re-identification still
  have to be measured, as in this study.

## 3c. Confidential hardware: TEEs on GPUs and TPUs (hypotheses, not tested)
Researched 2026-11-13; sources in the author's notes, dates to recheck before citing.
- **What exists:** confidential computing on NVIDIA Hopper and Blackwell GPUs (Azure, Google Cloud;
  Blackwell overhead reported by NVIDIA at about 1 to 8 %), Apple Private Cloud Compute, Google Private AI
  Compute. Google announced a confidential TPU system (TPU 8tx) on 9 Nov 2026; no attestation method, audit
  or availability date was published, so its claims cannot be checked yet.
- **Claude:** no confidential (TEE) inference is offered on any surface as of 13 Nov 2026. Anthropic has
  published research on it (June 2025) and licensed confidential-AI technology (Oct 2026); no product.
- **A TEE and a gate cover different threats; they complement each other:**
  | Threat | Local gate | TEE |
  |---|---|---|
  | operator or insider reads prompts | yes, for redacted items | yes, if attestation is sound |
  | provider retention, logs, legal requests | yes, the provider never had the secret | no, or untested |
  | the model infers or re-identifies from what it sees | partly | no |
  | know-how in code identifiers | weak (the main leak in v1) | yes, while in use |
  | quality loss from placeholders | possible | none |
- **Limits of trust in hardware:** physical attacks on memory (TEE.fail 2025, DDRop 2026) forged
  attestation on Intel TDX and broke AMD SEV-SNP integrity; vendors treat physical attacks as out of scope.
  A TEE moves trust to the chip vendor and the operator's data centre.
- **Law:** a TEE is a security measure (GDPR Art. 32), not a way out of transfer rules (Chapter V); no EDPB
  guidance on TEEs was found. Redaction is data minimisation (Art. 5(1)(c), 25), which a TEE is not.
- **Hypotheses to test later:**
  1. Gate + confidential inference leaves less residual risk than either alone (an open model on a
     confidential GPU vs Claude behind the gate, same canaries).
  2. Report leakage three ways: seen by the model, stored by the provider, readable by the operator. A TEE
     changes only the third.
  3. Accountability bundle (Art. 5(2)): gate log + commitment to the placeholder map (3b) + the server's
     attestation report: what was hidden, which code ran, on which hardware.
  4. For high-value code know-how, an open model in a TEE or on-premises may beat gate + frontier model.
- **Tier note:** a "confidential cloud" tier sits between Business and Frontier in the table in section 1.
  On laptops, Gemma 4 26B (14.4 GB at 4-bit) and 31B (17.5 GB) need more than 16 GB; a 32 to 64 GB machine
  runs both.

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
