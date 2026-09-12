import obspy
from obspy.clients.fdsn import Client

try:
    client = Client("ORFEUS")
    # Get station info with availability
    inv = client.get_stations(network="GB", station="ESK", level="channel")
    print(inv)
    for net in inv:
        for sta in net:
            for cha in sta:
                print(f"{cha.code} starts at {cha.start_date} and ends at {cha.end_date}")
except Exception as e:
    print(f"Error: {e}")
