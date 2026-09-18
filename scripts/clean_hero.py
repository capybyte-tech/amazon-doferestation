"""Genera assets/hero.jpg borrando textos del boceto (inpainting). Uso: python scripts/clean_hero.py"""
import cv2, numpy as np
im=cv2.imread('assets/boceto.png')
top=im[:545].copy()
hsv=cv2.cvtColor(top,cv2.COLOR_BGR2HSV); g=cv2.cvtColor(top,cv2.COLOR_BGR2GRAY)
mask=np.zeros(g.shape,np.uint8)
def box(x0,y0,x1,y1,cond):
    sub=cond[y0:y1,x0:x1]; mask[y0:y1,x0:x1]|=sub.astype(np.uint8)*255
box(15,5,352,62, g>35)
box(20,62,110,84, g>35)
box(1360,8,1672,165, g>22)
box(1128,55,1335,152, g>85)
white=(hsv[...,1]<70)&(hsv[...,2]>150)
box(1036,80,1142,232, white)

m=cv2.dilate(mask,np.ones((5,5),np.uint8),iterations=2)
m2=np.zeros_like(mask); sub=white[340:545,1600:1626]; m2[340:545,1600:1626]=sub*255
m2=cv2.dilate(m2,np.ones((3,3),np.uint8),iterations=2); m=m|m2
out=cv2.inpaint(top,m,4,cv2.INPAINT_TELEA)
cv2.imwrite('assets/hero.jpg',out,[cv2.IMWRITE_JPEG_QUALITY,88])
print('assets/hero.jpg actualizado')
