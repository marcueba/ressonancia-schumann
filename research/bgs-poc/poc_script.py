import obspy
from obspy.clients.fdsn import Client
import numpy as np
import scipy.signal as signal
import matplotlib.pyplot as plt
import os

os.makedirs('research/bgs-poc', exist_ok=True)

try:
    # Use ORFEUS or IRIS
    client = Client("ORFEUS")
    
    t1 = obspy.UTCDateTime("2024-01-01T00:00:00")
    t2 = obspy.UTCDateTime("2024-01-01T01:00:00")
    
    print("Downloading 1 hour of GB.ESK..HHZ data...")
    st = client.get_waveforms("GB", "ESK", "00", "HHZ", t1, t2)
    
    # Save original miniseed
    filename = "research/bgs-poc/esk_hhz_1hour.mseed"
    st.write(filename, format="MSEED")
    print(f"File saved: {filename}")
    
    tr = st[0]
    
    print("--- DATA INSPECTION ---")
    print(f"Samples: {tr.stats.npts}")
    print(f"Duration: {tr.stats.endtime - tr.stats.starttime} seconds")
    print(f"Sample rate: {tr.stats.sampling_rate} Hz")
    print(f"Min: {np.min(tr.data)}, Max: {np.max(tr.data)}")
    print(f"Mean: {np.mean(tr.data)}, StdDev: {np.std(tr.data)}")
    print(f"Gaps: {len(st.get_gaps())}")
    print(f"NaNs: {np.isnan(tr.data).sum()}")
    
    # Processing
    print("--- SPECTRAL ANALYSIS ---")
    # Detrend
    tr.detrend('linear')
    # Welch's method PSD
    # NPERSEG = 100 Hz * 60 seconds = 6000 (1 minute windows for good low freq resolution)
    # nperseg=4096 gives resolution of 100/4096 = ~0.024 Hz
    f, Pxx = signal.welch(tr.data, fs=tr.stats.sampling_rate, nperseg=4096, scaling='density')
    
    # Plot PSD
    plt.figure(figsize=(10, 6))
    plt.semilogy(f, Pxx)
    plt.xlim(0, 40)
    plt.title('Power Spectral Density - GB.ESK.00.HHZ (0-40 Hz)')
    plt.xlabel('Frequency (Hz)')
    plt.ylabel('PSD')
    plt.grid(True, which="both", ls="-", alpha=0.2)
    
    # Search for peaks
    # We restrict to 5-40 Hz
    mask = (f >= 5) & (f <= 40)
    f_sub = f[mask]
    pxx_sub = Pxx[mask]
    
    peaks, properties = signal.find_peaks(pxx_sub, prominence=np.max(pxx_sub)*0.05, distance=100) # distance ~ 2.4Hz
    
    print("--- PEAKS DETECTED (5-40Hz) ---")
    for p in peaks:
        freq = f_sub[p]
        power = pxx_sub[p]
        print(f"Found peak at {freq:.2f} Hz, Power: {power:.2e}")
        
        # Plot peak
        plt.plot(freq, power, "x", color="red", markersize=10)
        plt.text(freq, power, f"{freq:.2f} Hz", color="red", fontsize=9, verticalalignment='bottom')

    plt.savefig('research/bgs-poc/esk_spectrum.png')
    print("Spectrum plot saved to research/bgs-poc/esk_spectrum.png")
    
except Exception as e:
    print(f"Error during POC: {e}")
