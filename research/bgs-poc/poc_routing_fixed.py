import obspy
from obspy.clients.fdsn import RoutingClient
import numpy as np
import scipy.signal as signal
import matplotlib.pyplot as plt

try:
    client = RoutingClient("eida-routing")
    
    t1 = obspy.UTCDateTime("2023-01-01T00:00:00")
    t2 = obspy.UTCDateTime("2023-01-01T01:00:00")
    
    print("Downloading 1 hour of GB.ESK.00.HHZ data via routing...")
    st = client.get_waveforms(network="GB", station="ESK", location="00", channel="HHZ", starttime=t1, endtime=t2)
    
    st.write("research/bgs-poc/esk_hhz_1hour.mseed", format="MSEED")
    print("Saved file!")
    
    tr = st[0]
    
    print("--- DATA INSPECTION ---")
    print(f"Samples: {tr.stats.npts}")
    print(f"Duration: {tr.stats.endtime - tr.stats.starttime} seconds")
    print(f"Sample rate: {tr.stats.sampling_rate} Hz")
    
    # Preprocessing
    tr.detrend('linear')
    tr.taper(max_percentage=0.05, type='hann')
    
    # Welch's method PSD
    # Using nperseg=8192 for 100 Hz data -> 81.92 second windows, ~0.012 Hz resolution
    f, Pxx = signal.welch(tr.data, fs=tr.stats.sampling_rate, window='hann', nperseg=8192, scaling='density')
    
    plt.figure(figsize=(10, 6))
    plt.semilogy(f, Pxx)
    plt.xlim(0, 40)
    plt.title('Power Spectral Density - GB.ESK.00.HHZ (0-40 Hz)')
    plt.savefig('research/bgs-poc/esk_spectrum.png')
    print("Plot saved!")

    # Find peaks in 5-40 Hz
    mask = (f >= 5) & (f <= 40)
    f_sub = f[mask]
    pxx_sub = Pxx[mask]
    
    # Adjust prominence dynamically based on data scale
    prom = np.max(pxx_sub) * 0.05
    peaks, properties = signal.find_peaks(pxx_sub, prominence=prom, distance=100) # distance=100 samples ~ 1.2 Hz
    
    print("--- PEAKS DETECTED (5-40Hz) ---")
    for p in peaks:
        print(f"Found peak at {f_sub[p]:.2f} Hz, Power: {pxx_sub[p]:.2e}")

except Exception as e:
    print(f"Routing error: {e}")
