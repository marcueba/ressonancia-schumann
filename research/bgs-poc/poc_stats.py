import obspy
import numpy as np
import os

st = obspy.read("research/bgs-poc/esk_hhz_1hour.mseed")
tr = st[0]

print("--- FILE STATS ---")
print(f"File size: {os.path.getsize('research/bgs-poc/esk_hhz_1hour.mseed')} bytes")
print(f"Min: {np.min(tr.data)}, Max: {np.max(tr.data)}")
print(f"Mean: {np.mean(tr.data):.2f}, StdDev: {np.std(tr.data):.2f}")
print(f"Gaps: {len(st.get_gaps())}")
print(f"NaNs: {np.isnan(tr.data).sum()}")

# Let's try to get inventory (calibration info) from FDSN
from obspy.clients.fdsn import RoutingClient
try:
    client = RoutingClient("eida-routing")
    inv = client.get_stations(network="GB", station="ESK", location="00", channel="HHZ", 
                              starttime=tr.stats.starttime, endtime=tr.stats.endtime, level="response")
    print("\n--- CALIBRATION INFO ---")
    resp = inv[0][0][0].response
    print(f"Instrument Sensitivity: {resp.instrument_sensitivity.value} {resp.instrument_sensitivity.input_units} -> {resp.instrument_sensitivity.output_units}")
except Exception as e:
    print(f"Could not fetch calibration: {e}")
