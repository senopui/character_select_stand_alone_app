import tkinter as tk
from tkinter import simpledialog, messagebox

class setup_wizard_window:   
    def __init__(self):
        pass

    def message(self, title, prompt):
        root = tk.Tk()
        root.withdraw()
        root.attributes("-topmost", True)
        messagebox.showinfo(title, prompt, parent=root)
        root.destroy()

    def get_string(self, title, prompt, default_value):
        root = tk.Tk()
        root.withdraw()
        root.attributes("-topmost", True)
        result = simpledialog.askstring(title, prompt, initialvalue=default_value, parent=root)
        root.destroy()
        if result is not None:
            return result
        else:
            return None

    def get_choice(self, title, prompt, choice, default_value):
        root = tk.Tk()
        root.withdraw()
        root.attributes("-topmost", True)
        choices = choice
        result = simpledialog.askstring(title, prompt, initialvalue=default_value, parent=root)
        root.destroy()
        if result in choices:
            return result
        else:
            return None
        
    def ask_yes_no(self, title, prompt):
        root = tk.Tk()
        root.withdraw()
        root.attributes("-topmost", True)
        result = messagebox.askyesno(title, prompt, parent=root)
        root.destroy()
        return result

    def run(self, title, prompt):
        root = tk.Tk()
        root.withdraw()
        root.attributes("-topmost", True)
        self.message(title, prompt)
        root.destroy()