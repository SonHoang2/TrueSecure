import torch
import torch.nn.functional as F
from facenet_pytorch import MTCNN, InceptionResnetV1
from pytorch_grad_cam import GradCAM
from pytorch_grad_cam.utils.model_targets import ClassifierOutputTarget
from pytorch_grad_cam.utils.image import show_cam_on_image
from PIL import ImageFont, ImageDraw, Image
import numpy as np
import cv2

from face_detection import detect_bounding_box

# Should return True if CUDA is available
print("torch.cuda.is_available()", torch.cuda.is_available())

if torch.cuda.is_available():
    print("torch.cuda.get_device_name(0):", torch.cuda.get_device_name(0))
    print("Using GPU for inference")
else:
    print("CUDA not available, using CPU for inference")

DEVICE = "cuda:0" if torch.cuda.is_available() else "cpu"

mtcnn = MTCNN(
    select_largest=False,
    post_process=False,
    device=DEVICE
).to(DEVICE).eval()

model = InceptionResnetV1(
    pretrained="vggface2",
    classify=True,
    num_classes=1,
    device=DEVICE
)
checkpoint = torch.load(
    "weights/resnetinceptionv1_epoch_32.pth", map_location=torch.device('cpu'))
model.load_state_dict(checkpoint["model_state_dict"])
model.to(DEVICE)
model.eval()


def predict(frame):
    """Predict the label of the input frame"""
    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    input_image = Image.fromarray(frame_rgb)

    faces = detect_bounding_box(frame)  # Detect faces

    is_deepfake = None
    confidence = None

    for (x, y, w, h) in faces:
        face_region = frame[y:y + h, x:x + w]  # Extract face region

        # Perform face recognition on the extracted face region
        input_face = Image.fromarray(
            cv2.cvtColor(face_region, cv2.COLOR_BGR2RGB))
        input_face = mtcnn(input_face)
        if input_face is None:
            continue

        input_face = input_face.unsqueeze(0)  # add the batch dimension
        input_face = F.interpolate(input_face, size=(
            256, 256), mode="bilinear", align_corners=False)
        input_face = input_face.to(DEVICE).to(torch.float32) / 255.0

        target_layers = [model.block8.branch1[-1]]
        cam = GradCAM(model=model, target_layers=target_layers)
        targets = [ClassifierOutputTarget(0)]

        grayscale_cam = cam(input_tensor=input_face,
                            targets=targets, eigen_smooth=True)
        grayscale_cam = grayscale_cam[0, :]
        visualization = show_cam_on_image(
            input_face.squeeze(0).permute(1, 2, 0).cpu().detach().numpy(), grayscale_cam, use_rgb=True
        )

        with torch.no_grad():
            output = torch.sigmoid(model(input_face).squeeze(0))
            prediction = "Fake" if output.item() < 0.5 else "Real"
            confidence = output.item()

        if prediction == "Fake":
            print("Deepfake detected, confidence: ", confidence * 100)
            frame = cv2.rectangle(
                frame, (x, y), (x + w, y + h), (0, 0, 255), 4)
            frame = cv2.putText(frame, "Deep Fake Detected", (x, y - 10),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 0, 255), 2)
            is_deepfake = True
        else:
            print("Real face, confidence: ", confidence * 100)
            frame = cv2.rectangle(
                frame, (x, y), (x + w, y + h), (255, 0, 0), 4)
            frame = cv2.putText(frame, "Real Face", (x, y - 10),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255, 0, 0), 2)
            is_deepfake = False

    return is_deepfake, confidence, frame
