import codecs
path = 'src/pages/admin/Admin.jsx'
with codecs.open(path, 'r', 'utf-8') as f:
    text = f.read()
text = text.replace(" style={{ fontFamily: 'Nunito' }}", "")
text = text.replace(" font-black", " font-bold")
with codecs.open(path, 'w', 'utf-8') as f:
    f.write(text)
