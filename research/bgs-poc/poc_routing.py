import obspy
from obspy.clients.fdsn import RoutingClient
import numpy as np
import scipy.signal as signal
import matplotlib.pyplot as plt

try:
    client = RoutingClient("eida-routing")
    
    # Try 2023-01-01
    t1 = obspy.UTCDateTime("2023-01-01T00:00:00")
    t2 = obspy.UTCDateTime("2023-01-01T01:00:00")
    
    print("Downloading 1 hour of GB.ESK..HHZ data via routing...")
    st = client.get_waveforms("GB", "ESK", "00", "HHZ", t1, t2)
    
    st.write("research/bgs-poc/esk_hhz_1hour.mseed", format="MSEED")
    print("Saved file!")
    
    tr = st[0]
    
    print("--- DATA INSPECTION ---")
    print(f"Samples: {tr.stats.npts}")
    print(f"Duration: {tr.stats.endtime - tr.stats.starttime} seconds")
    print(f"Sample rate: {tr.stats.sampling_rate} Hz")
    
    f, Pxx = signal.welch(tr.data, fs=tr.stats.sampling_rate, nperseg=4096, scaling='density')
    
    plt.figure(figsize=(10, 6))
    plt.semilogy(f, Pxx)
    plt.xlim(0, 40)
    plt.title('Power Spectral Density - GB.ESK.00.HHZ (0-40 Hz)')
    plt.savefig('research/bgs-poc/esk_spectrum.png')
    print("Plot saved!")

except Exception as e:
    print(f"Routing error: {e}")
