import obspy
from obspy.clients.fdsn import RoutingClient
import numpy as np
import scipy.signal as signal
import matplotlib.pyplot as plt
import csv
import os
import warnings
warnings.filterwarnings("ignore")

def get_psd_and_peaks(tr, nperseg=8192):
    tr_copy = tr.copy()
    tr_copy.detrend('linear')
    tr_copy.taper(max_percentage=0.05, type='hann')
    f, Pxx = signal.welch(tr_copy.data, fs=tr_copy.stats.sampling_rate, window='hann', nperseg=nperseg, scaling='density')
    
    windows = [(7, 9), (13, 15), (19, 22), (25, 28), (31, 34)]
    detected_peaks = []
    
    for (fmin, fmax) in windows:
        mask = (f >= fmin) & (f <= fmax)
        f_sub = f[mask]
        Pxx_sub = Pxx[mask]
        
        if len(Pxx_sub) == 0:
            detected_peaks.append((np.nan, np.nan))
            continue
            
        prom = np.max(Pxx_sub) * 0.05
        peaks, _ = signal.find_peaks(Pxx_sub, prominence=prom, distance=40)
        
        if len(peaks) > 0:
            best_idx = peaks[np.argmax(Pxx_sub[peaks])]
            detected_peaks.append((f_sub[best_idx], Pxx_sub[best_idx]))
        else:
            detected_peaks.append((np.nan, np.nan))
            
    return f, Pxx, detected_peaks

def download_data(net, sta, loc, cha, t1, t2, filename):
    if os.path.exists(filename):
        return obspy.read(filename)[0]
    try:
        client = RoutingClient("eida-routing")
        st = client.get_waveforms(network=net, station=sta, location=loc, channel=cha, starttime=t1, endtime=t2)
        st.write(filename, format="MSEED")
        return st[0]
    except Exception as e:
        print(f"Failed to download {cha} from {t1}: {e}")
        return None

def main():
    print("--- 1. REPRODUÇÃO & 2. DIVISÃO EM SEGMENTOS ---")
    tr_orig = obspy.read("research/bgs-poc/esk_hhz_1hour.mseed")[0]
    
    segment_duration = 600
    starts = [tr_orig.stats.starttime + i * segment_duration for i in range(6)]
    
    segment_results = []
    for i, tstart in enumerate(starts):
        tr_seg = tr_orig.slice(tstart, tstart + segment_duration)
        f, Pxx, peaks = get_psd_and_peaks(tr_seg, nperseg=4096)
        row = [f"Seg {i+1}"]
        for p in peaks:
            row.append(f"{p[0]:.2f}" if not np.isnan(p[0]) else "-")
        segment_results.append(row)
        
    with open('research/bgs-poc/segments_stability.csv', 'w', newline='') as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(["Segmento", "Pico ~7-9 Hz", "Pico ~13-15 Hz", "Pico ~19-22 Hz", "Pico ~25-28 Hz", "Pico ~31-34 Hz"])
        writer.writerows(segment_results)

    print("\n--- 4. OUTRO HORÁRIO (12:00 UTC) ---")
    t1_12 = obspy.UTCDateTime("2023-01-01T12:00:00")
    t2_12 = obspy.UTCDateTime("2023-01-01T13:00:00")
    tr_12 = download_data("GB", "ESK", "00", "HHZ", t1_12, t2_12, "research/bgs-poc/esk_hhz_hour12.mseed")
    if tr_12:
        f_12, Pxx_12, peaks_12 = get_psd_and_peaks(tr_12)
        print("Peaks at 12:00 UTC:", [f"{p[0]:.2f} Hz" if not np.isnan(p[0]) else "-" for p in peaks_12])

    print("\n--- 5. OUTROS CANAIS (HHN, HHE) 00:00 UTC ---")
    t1_00 = obspy.UTCDateTime("2023-01-01T00:00:00")
    t2_00 = obspy.UTCDateTime("2023-01-01T01:00:00")
    
    tr_hhn = download_data("GB", "ESK", "00", "HHN", t1_00, t2_00, "research/bgs-poc/esk_hhn_1hour.mseed")
    tr_hhe = download_data("GB", "ESK", "00", "HHE", t1_00, t2_00, "research/bgs-poc/esk_hhe_1hour.mseed")
    
    if tr_hhn and tr_hhe:
        plt.figure(figsize=(12, 6))
        f_z, Pxx_z, peaks_z = get_psd_and_peaks(tr_orig)
        f_n, Pxx_n, peaks_n = get_psd_and_peaks(tr_hhn)
        f_e, Pxx_e, peaks_e = get_psd_and_peaks(tr_hhe)
        
        plt.semilogy(f_z, Pxx_z, label="HHZ (Vertical)", color="black", alpha=0.7)
        plt.semilogy(f_n, Pxx_n, label="HHN (North)", color="blue", alpha=0.7)
        plt.semilogy(f_e, Pxx_e, label="HHE (East)", color="red", alpha=0.7)
        plt.xlim(0, 40)
        plt.legend()
        plt.title('PSD Comparison: HHZ vs HHN vs HHE (00:00 UTC)')
        plt.savefig('research/bgs-poc/channels_comparison.png')
        
        print("Peaks HHZ:", [f"{p[0]:.2f}" if not np.isnan(p[0]) else "-" for p in peaks_z])
        print("Peaks HHN:", [f"{p[0]:.2f}" if not np.isnan(p[0]) else "-" for p in peaks_n])
        print("Peaks HHE:", [f"{p[0]:.2f}" if not np.isnan(p[0]) else "-" for p in peaks_e])

if __name__ == "__main__":
    main()
