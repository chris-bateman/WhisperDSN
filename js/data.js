// ── Data Loading ─────────────────────────────────────────────────────
const DSN_SNAPSHOT = `<dsn>
<station name="gdscc" friendlyName="Goldstone" timeUTC="1772362932000" timeZoneOffset="-28800000.0"/>
<dish name="DSS14" azimuthAngle="0" elevationAngle="90" windSpeed="" isMSPA="false" isArray="false" isDDOR="false" activity="Antenna Maintenance">
<target name="DSS" id="99" uplegRange="-1" downlegRange="-1" rtlt="-1"/>
</dish>
<dish name="DSS24" azimuthAngle="81" elevationAngle="17" windSpeed="16" isMSPA="false" isArray="false" isDDOR="false" activity="Telemetry, Tracking, Command">
<upSignal active="false" signalType="none" dataRate="0" frequency="0" band="S" power="0" spacecraft="CHDR" spacecraftID="-151"/>
<downSignal active="false" signalType="none" dataRate="0" frequency="0" band="S" power="-150" spacecraft="CHDR" spacecraftID="-151"/>
<target name="CHDR" id="151" uplegRange="101000" downlegRange="101000" rtlt="0.67"/>
</dish>
<dish name="DSS26" azimuthAngle="180" elevationAngle="90" windSpeed="16" isMSPA="false" isArray="false" isDDOR="false" activity="Telemetry, Tracking, Command">
<upSignal active="false" signalType="none" dataRate="0" frequency="0" band="X" power="0" spacecraft="EURC" spacecraftID="-159"/>
<downSignal active="false" signalType="none" dataRate="0" frequency="0" band="Ka" power="-160" spacecraft="EURC" spacecraftID="-159"/>
<target name="EURC" id="159" uplegRange="280000000" downlegRange="280000000" rtlt="1870"/>
</dish>
<station name="mdscc" friendlyName="Madrid" timeUTC="1772362932000" timeZoneOffset="3600000.0"/>
<dish name="DSS53" azimuthAngle="0" elevationAngle="90" windSpeed="" isMSPA="false" isArray="false" isDDOR="false" activity="Engineering Upgrades">
<target name="DSN" id="99" uplegRange="-1" downlegRange="-1" rtlt="-1"/>
</dish>
<dish name="DSS63" azimuthAngle="167" elevationAngle="36" windSpeed="12" isMSPA="false" isArray="false" isDDOR="false" activity="Telemetry, Tracking, Command">
<upSignal active="true" signalType="data" dataRate="0" frequency="0" band="X" power="9.9" spacecraft="M01O" spacecraftID="-53"/>
<downSignal active="true" signalType="data" dataRate="66360" frequency="0" band="X" power="-130" spacecraft="M01O" spacecraftID="-53"/>
<downSignal active="false" signalType="none" dataRate="0" frequency="0" band="X" power="-160" spacecraft="MEX" spacecraftID="-41"/>
<target name="M01O" id="53" uplegRange="350000000" downlegRange="350000000" rtlt="2340"/>
<target name="MEX" id="41" uplegRange="350000000" downlegRange="350000000" rtlt="2340"/>
</dish>
<dish name="DSS54" azimuthAngle="94" elevationAngle="90" windSpeed="10" isMSPA="false" isArray="false" isDDOR="false" activity="Telemetry, Tracking, Command">
<downSignal active="false" signalType="none" dataRate="66360" frequency="0" band="X" power="-140" spacecraft="M01O" spacecraftID="-53"/>
<downSignal active="false" signalType="none" dataRate="931500" frequency="0" band="X" power="-150" spacecraft="MRO" spacecraftID="-74"/>
<upSignal active="false" signalType="none" dataRate="0" frequency="0" band="X" power="0" spacecraft="MRO" spacecraftID="-74"/>
<target name="M01O" id="53" uplegRange="350000000" downlegRange="350000000" rtlt="2340"/>
<target name="MRO" id="74" uplegRange="350000000" downlegRange="350000000" rtlt="2340"/>
</dish>
<dish name="DSS65" azimuthAngle="157" elevationAngle="34" windSpeed="12" isMSPA="false" isArray="false" isDDOR="false" activity="Telemetry, Tracking, Command">
<upSignal active="true" signalType="data" dataRate="0" frequency="0" band="S" power="0.1" spacecraft="SOHO" spacecraftID="-21"/>
<downSignal active="true" signalType="data" dataRate="245800" frequency="0" band="S" power="-120" spacecraft="SOHO" spacecraftID="-21"/>
<target name="SOHO" id="21" uplegRange="1650000" downlegRange="1650000" rtlt="11"/>
</dish>
<dish name="DSS56" azimuthAngle="164" elevationAngle="32" windSpeed="12" isMSPA="false" isArray="false" isDDOR="false" activity="Telemetry, Tracking, Command">
<upSignal active="true" signalType="data" dataRate="0" frequency="0" band="S" power="0.3" spacecraft="ACE" spacecraftID="-92"/>
<downSignal active="true" signalType="data" dataRate="87650" frequency="0" band="S" power="-110" spacecraft="ACE" spacecraftID="-92"/>
<target name="ACE" id="92" uplegRange="1480000" downlegRange="1480000" rtlt="9.86"/>
</dish>
<station name="cdscc" friendlyName="Canberra" timeUTC="1772362932000" timeZoneOffset="39600000.0"/>
<dish name="DSS43" azimuthAngle="145" elevationAngle="47" windSpeed="0" isMSPA="false" isArray="false" isDDOR="false" activity="Science Radar Astronomy">
<target name="GBRA" id="99" uplegRange="-1" downlegRange="-1" rtlt="-1"/>
</dish>
<dish name="DSS36" azimuthAngle="132" elevationAngle="70" windSpeed="0" isMSPA="false" isArray="false" isDDOR="false" activity="Telemetry, Tracking, Command">
<upSignal active="true" signalType="data" dataRate="0" frequency="0" band="S" power="0.1" spacecraft="XMM" spacecraftID="-60"/>
<downSignal active="true" signalType="data" dataRate="80660" frequency="0" band="S" power="-120" spacecraft="XMM" spacecraftID="-60"/>
<target name="XMM" id="60" uplegRange="90100" downlegRange="90100" rtlt="0.6"/>
</dish>
<dish name="DSS35" azimuthAngle="57" elevationAngle="24" windSpeed="0" isMSPA="false" isArray="false" isDDOR="false" activity="Telemetry, Tracking, Command">
<upSignal active="true" signalType="data" dataRate="0" frequency="0" band="X" power="0.2" spacecraft="ESCB" spacecraftID="-9"/>
<downSignal active="true" signalType="data" dataRate="8000" frequency="0" band="X" power="-130" spacecraft="ESCB" spacecraftID="-9"/>
<target name="ESCB" id="9" uplegRange="2000000" downlegRange="2000000" rtlt="13.3"/>
</dish>
<dish name="DSS34" azimuthAngle="20" elevationAngle="90" windSpeed="0" isMSPA="false" isArray="false" isDDOR="false" activity="Telemetry, Tracking, Command">
<upSignal active="true" signalType="data" dataRate="0" frequency="0" band="S" power="0.2" spacecraft="LRO" spacecraftID="-85"/>
<downSignal active="false" signalType="none" dataRate="0" frequency="0" band="K" power="-400" spacecraft="LRO" spacecraftID="-85"/>
<downSignal active="false" signalType="none" dataRate="0" frequency="0" band="S" power="-480" spacecraft="LRO" spacecraftID="-85"/>
<target name="LRO" id="85" uplegRange="373000" downlegRange="373000" rtlt="2.49"/>
</dish>
<timestamp>1772362932000</timestamp>
</dsn>`;

async function fetchDSN() {
  // Try Worker endpoint first
  try {
    const resp = await fetch(WORKER_URL);
    if (resp.ok) {
      const data = await resp.json();
      parseDSNJSON(data);
      if (audioEnabled) updateAudio();
      return;
    }
  } catch(e) {}

  // Fallback: try NASA directly (will CORS-block in most browsers)
  try {
    const resp = await fetch('https://eyes.jpl.nasa.gov/dsn/data/dsn.xml');
    if (resp.ok) {
      const text = await resp.text();
      parseDSN(text);
      if (audioEnabled) updateAudio();
      return;
    }
  } catch(e) {}

  // Last resort: embedded snapshot
  parseDSN(DSN_SNAPSHOT);
  if (audioEnabled) updateAudio();
}

// Fetch spacecraft names once on load (24hr edge cache on Worker)
async function fetchSpacecraftNames() {
  try {
    const resp = await fetch(WORKER_URL + 'spacecraft');
    if (resp.ok) {
      const data = await resp.json();
      Object.assign(spacecraftNames, data);
    }
  } catch(e) {}
}
