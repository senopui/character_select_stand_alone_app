import time
import websocket
from typing import Dict, Any

CAT = "[WebSocket Client]"

class WebSocketClient:
    def __init__(self, websocket_address: str, websocket_port: int, timeout: int = 5):
        self.addr = f'ws://{websocket_address}:{websocket_port}/ws'
        self.timeout = timeout
        self.ws = None

    def connect(self) -> bool:
        try:
            self.ws = websocket.WebSocket()
            self.ws.connect(self.addr, timeout=self.timeout)
            #print(f"{CAT} WebSocket client connected to {self.addr}")
            return True
        except Exception as e:
            print(f"{CAT} Failed to connect WebSocket client: {str(e)}")
            return False

    def send_message(self, message: Dict[str, Any], wait_for_ack: bool = False, max_wait: float = 0.5) -> bool:
        if not self.ws or not self.ws.connected:
            if not self.connect():
                return False

        try:
            self.ws.send(message)
            #print(f"{CAT} Sent message: {len(message)} bytes")
            
            if wait_for_ack:
                start_time = time.time()
                self.ws.settimeout(self.timeout)
                while time.time() - start_time < max_wait:
                    try:
                        response = self.ws.recv()
                        #print(f"{CAT} Received ACK: {response}")
                        return True
                    except websocket.WebSocketTimeoutException:
                        continue
                print(f"{CAT} No ACK received within {max_wait} seconds")
                return False
            
            time.sleep(0.1)
            return True
        except Exception as e:
            print(f"{CAT} Failed to send message: {str(e)}")
            return False

    def close(self):
        if self.ws and self.ws.connected:
            try:
                self.ws.close()
                #print(f"{CAT} WebSocket client closed")
            except Exception as e:
                print(f"{CAT} Failed to close WebSocket client: {str(e)}")
            self.ws = None

def send_websocket_message(message: Dict[str, Any], websocket_address: str, websocket_port: int, timeout: int = 5) -> bool:
    client = WebSocketClient(websocket_address, websocket_port, timeout)
    success = client.send_message(message, wait_for_ack=True)    
    client.close()
    return success
