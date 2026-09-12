import obspy
from obspy.clients.fdsn import RoutingClient
from obspy.clients.fdsn.header import FDSNNoDataException

try:
    client = RoutingClient("eida-routing") # Try European networks
    inventory = client.get_stations(network="GB", station="ESK", level="channel")
    print(inventory)
    for network in inventory:
        for station in network:
            for channel in station:
                print(f"Channel: {channel.code}, Sample Rate: {channel.sample_rate}, Location: {channel.location_code}")
except Exception as e:
    print(f"EIDA routing error: {e}")
