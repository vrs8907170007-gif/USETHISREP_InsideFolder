PRIVATE — e-book files sold on the website.
Name each file <book id>.pdf or <book id>.epub (ids are in catalog.json), e.g. divine-code.pdf.
This folder is blocked from the web (netlify.toml). A file here is sent ONLY through a buyer's personal
download link, which is created after Razorpay confirms payment, works 5 times, and stops working if the
order is refunded. Never put book files in assets/ — everything in assets/ is public.
Keep each file under 20 MB.
