import tkinter as tk
from tkinter import simpledialog, messagebox, Toplevel, StringVar, Button, Label

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

    def get_choice(self, title, prompt, choices, default_value):
        if isinstance(choices, str):
            choices = [choice.strip() for choice in choices.split(",")]
            
        root = tk.Tk()
        root.withdraw()  
        dialog = Toplevel(root)
        dialog.title(title)
        dialog.attributes("-topmost", True)
        dialog.grab_set()

        selected_choice = StringVar(value=default_value)
        Label(dialog, text=prompt, padx=10, pady=10).pack()

        for choice in choices:
            tk.Radiobutton(
                dialog,
                text=choice,
                value=choice,
                variable=selected_choice,
                padx=10,
                pady=5
            ).pack(anchor="w")

        result = [None] 
        
        def on_ok():
            result[0] = selected_choice.get()
            dialog.destroy()

        def on_cancel():
            result[0] = None
            dialog.destroy()

        button_frame = tk.Frame(dialog)
        button_frame.pack(pady=10)
        Button(button_frame, text="OK", command=on_ok).pack(side="left", padx=5)
        Button(button_frame, text="Cancel", command=on_cancel).pack(side="left", padx=5)

        dialog.update_idletasks()
        width = dialog.winfo_width()
        height = dialog.winfo_height()
        x = (dialog.winfo_screenwidth() // 2) - (width // 2)
        y = (dialog.winfo_screenheight() // 2) - (height // 2)
        dialog.geometry(f"{width}x{height}+{x}+{y}")

        dialog.wait_window()
        root.destroy()
        return result[0] if result[0] in choices else None

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