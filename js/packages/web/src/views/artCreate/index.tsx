import React, { useEffect, useState, useCallback, useRef } from 'react';
import VideoPlayer from "react-background-video-player";
import axios from 'axios';
import { notify, sleep } from '@oyster/common';
import {
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  InputNumber,
  List,
  Progress,
  Row,
  Slider,
  Space,
  Spin,
  Statistic,
  Steps,
  Typography,
  Upload,
} from 'antd';
import { ArtCard } from './../../components/ArtCard';
import { UserSearch, UserValue } from './../../components/UserSearch';
import { Confetti } from './../../components/Confetti';
import { mintNFT } from '../../actions';
import { useCoingecko } from '../../contexts';
import {
  MAX_METADATA_LEN,
  useConnection,
  IMetadataExtension,
  Attribute,
  MetadataCategory,
  useConnectionConfig,
  Creator,
  shortenAddress,
  MetaplexModal,
  MetaplexOverlay,
  MetadataFile,
  StringPublicKey,
} from '@oyster/common';
import { useWallet } from '@solana/wallet-adapter-react';
import { getAssetCostToStore, LAMPORT_MULTIPLIER } from '../../utils/assets';
import { Connection } from '@solana/web3.js';
import { MintLayout } from '@solana/spl-token';
import { useHistory, useParams } from 'react-router-dom';
import { cleanName, getLast } from '../../utils/utils';
import { AmountLabel } from '../../components/AmountLabel';
import useWindowDimensions from '../../utils/layout';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { baseURL } from '../../config/api';
import { needMetadataUpdate, setNeedMetadataUpdate } from '../../actions/nft';
import { delay } from 'lodash';

const { Step } = Steps;
const { Dragger } = Upload;
const { Text } = Typography;
const poorPirceLimit = 4555;
const totalNFTLimit = 5555;

export const ArtCreateView = () => {
  const connection = useConnection();
  const { env } = useConnectionConfig();
  const wallet = useWallet();
  const { step_param }: { step_param: string } = useParams();
  const history = useHistory();
  const { width } = useWindowDimensions();
  const { totalNFTs } = useCoingecko();

  const [step, setStep] = useState<number>(0);
  const [cost, setCost] = useState<number>(0.00);
  const [approved, setApproved] = useState<boolean>(false);
  const [stepsVisible, setStepsVisible] = useState<boolean>(false);//true);
  const [progress, setProgress] = useState<number>(0);
  const [nft, setNft] =
    useState<{ metadataAccount: StringPublicKey } | undefined>(undefined);
  const [files, setFiles] = useState<File[]>([]);
  const [pogFile, setPogFile] = useState<File>();
  const [attributes, setAttributes] = useState<IMetadataExtension>({
    name: '',
    symbol: '',
    description: '',
    external_url: '',
    image: '',
    animation_url: undefined,
    attributes: undefined,
    seller_fee_basis_points: 0,
    creators: [],
    properties: {
      files: [],
      category: MetadataCategory.Image,
    },
  });

  const gotoStep = useCallback(
    (_step: number) => {
      history.push(`/art/create/${_step.toString()}`);
      if (_step === 0) setStepsVisible(false);//true);
    },
    [history],
  );

  useEffect(() => {
    if (totalNFTs >= totalNFTLimit) {
      notify({
        message: 'All Pogs are already minted',
        description: (
          <p>
            Could not mint Solana Pog NFT at this Moment <br /> There are already {totalNFTLimit} NFTs!
          </p>
        ),
        type: 'warning',
      });
      history.push('/');
    }
  }, []);
  
  useEffect(() => {
    if (step_param) setStep(parseInt(step_param));
    else gotoStep(0);
  }, [step_param, gotoStep]);

  // store files
  const mint = async () => {
    const metadata = {
      name: attributes.name,
      symbol: attributes.symbol,
      creators: attributes.creators,
      description: attributes.description,
      sellerFeeBasisPoints: attributes.seller_fee_basis_points,
      image: attributes.image,
      animation_url: attributes.animation_url,
      attributes: attributes.attributes,
      external_url: attributes.external_url,
      properties: {
        files: attributes.properties.files,
        category: attributes.properties?.category,
      },
    };
    //setStepsVisible(false); 
    setApproved(false);

    const intervalStart = (max) => {
      return setInterval(
        () => setProgress(prog => Math.min(prog + 1, max)),
        600,
      );
    }
    
    let inte = intervalStart(3);
      // Update progress inside mintNFT
    try {
      const progressCallBack = (maxValue) => {
        setApproved(true);
        clearInterval(inte);
        if (maxValue === 96) setProgress(81);
        else if (maxValue === 99) setProgress(96);
        setTimeout(() => {
          inte = intervalStart(maxValue);
        }, 100);
        // inte = intervalStart(maxValue);
        console.log(`Callback Value --> ${maxValue}`);
      };
      const _nft = await mintNFT(
        connection,
        wallet,
        env,
        files,
        metadata,
        attributes.properties?.maxSupply,
        progressCallBack,
        totalNFTs <= totalNFTLimit,
      );
      setProgress(99);
      await sleep(500);
      if (_nft) setNft(_nft);
    } catch (e) {
      console.log('Error occured ===>');
      console.log(e);
      
      notify({
        message: 'Minting Error',
        description: (
          <p>
            Could not mint NFT on Solana at this Moment <br /> Try again later!
          </p>
        ),
        type: 'warning',
      });
      throw e;
    } finally {
      clearInterval(inte);
    }
  };

  return (
    <>
      <Row style={{ paddingTop: 50 }}>
        {stepsVisible && (
          <Col span={24} md={4}>
            <Steps
              progressDot
              direction={width < 768 ? 'horizontal' : 'vertical'}
              current={step}
              style={{
                width: 'fit-content',
                margin: '0 auto 30px auto',
                overflowX: 'auto',
                maxWidth: '100%',
              }}
            >
              <Step title="Category" />
              <Step title="Upload" />
              <Step title="Info" />
              <Step title="Royalties" />
              <Step title="Launch" />
            </Steps>
          </Col>
        )}
        <Col span={24} {...(stepsVisible ? { md: 20 } : { md: 24 })}>
          {/* {step === 0 && (
            <CategoryStep
              confirm={(category: MetadataCategory) => {
                setAttributes({
                  ...attributes,
                  properties: {
                    ...attributes.properties,
                    category,
                  },
                });
                gotoStep(1);
              }}
            />
          )}
          {step === 1 && (
            <UploadStep
              attributes={attributes}
              setAttributes={setAttributes}
              files={files}
              setFiles={setFiles}
              confirm={() => gotoStep(2)}
            />
          )}

          {step === 2 && (
            <InfoStep
              attributes={attributes}
              files={files}
              setAttributes={setAttributes}
              confirm={() => gotoStep(3)}
            />
          )}
          {step === 3 && (
            <RoyaltiesStep
              attributes={attributes}
              confirm={() => gotoStep(4)}
              setAttributes={setAttributes}
            />
          )} */}
          {step <= 4 && (
            <LaunchStep
              attributes={attributes}
              setAttributes={setAttributes}
              files={files}
              setFiles={setFiles}
              setPogFile={setPogFile}
              confirm={() => { gotoStep(5); }}
            />
          )}
          {step === 5 && (
            <WaitingStep
              mint={mint}
              attributes={attributes}
              files={files}
              pogFile={pogFile}
              // setCostAmount={setCost}
              nft={nft}
              progress={progress}
              // connection={connection}
              approved={approved}
              // confirm={async() => gotoStep(6)}
            />
          )}
          {/* {0 < step && step < 5 && (
            <div style={{ margin: 'auto', width: 'fit-content' }}>
              <Button onClick={() => gotoStep(step - 1)}>Back</Button>
            </div>
          )} */}
        </Col>
      </Row>
      {/* <MetaplexOverlay
        style={{
          position: 'absolute',
          left: 0,
          top: '100px',
        }}
        visible={step === 6}
      >
        <Congrats
          nft={nft}
          attributes={attributes}
          files={files}
          cost={cost}
        />
      </MetaplexOverlay> */}
    </>
  );
};

const CategoryStep = (props: {
  confirm: (category: MetadataCategory) => void;
}) => {
  const { width } = useWindowDimensions();
  return (
    <>
      <Row className="call-to-action">
        <h2>Create a new item</h2>
        <p>
          First time creating on Metaplex?{' '}
          <a href="#">Read our creators’ guide.</a>
        </p>
      </Row>
      <Row justify={width < 768 ? 'center' : 'start'}>
        <Col>
          <Row>
            <Button
              className="type-btn"
              size="large"
              onClick={() => props.confirm(MetadataCategory.Image)}
            >
              <div>
                <div>Image</div>
                <div className="type-btn-description">JPG, PNG, GIF</div>
              </div>
            </Button>
          </Row>
          <Row>
            <Button
              className="type-btn"
              size="large"
              onClick={() => props.confirm(MetadataCategory.Video)}
            >
              <div>
                <div>Video</div>
                <div className="type-btn-description">MP4, MOV</div>
              </div>
            </Button>
          </Row>
          <Row>
            <Button
              className="type-btn"
              size="large"
              onClick={() => props.confirm(MetadataCategory.Audio)}
            >
              <div>
                <div>Audio</div>
                <div className="type-btn-description">MP3, WAV, FLAC</div>
              </div>
            </Button>
          </Row>
          <Row>
            <Button
              className="type-btn"
              size="large"
              onClick={() => props.confirm(MetadataCategory.VR)}
            >
              <div>
                <div>AR/3D</div>
                <div className="type-btn-description">GLB</div>
              </div>
            </Button>
          </Row>
        </Col>
      </Row>
    </>
  );
};

const UploadStep = (props: {
  attributes: IMetadataExtension;
  setAttributes: (attr: IMetadataExtension) => void;
  files: File[];
  setFiles: (files: File[]) => void;
  confirm: () => void;
}) => {
  const [coverFile, setCoverFile] = useState<File | undefined>(
    props.files?.[0],
  );
  const [mainFile, setMainFile] = useState<File | undefined>(props.files?.[1]);

  const [customURL, setCustomURL] = useState<string>('');
  const [customURLErr, setCustomURLErr] = useState<string>('');
  const disableContinue = !coverFile || !!customURLErr;

  useEffect(() => {
    props.setAttributes({
      ...props.attributes,
      properties: {
        ...props.attributes.properties,
        files: [],
      },
    });
  }, []);

  const uploadMsg = (category: MetadataCategory) => {
    switch (category) {
      case MetadataCategory.Audio:
        return 'Upload your audio creation (MP3, FLAC, WAV)';
      case MetadataCategory.Image:
        return 'Upload your image creation (PNG, JPG, GIF)';
      case MetadataCategory.Video:
        return 'Upload your video creation (MP4, MOV, GLB)';
      case MetadataCategory.VR:
        return 'Upload your AR/VR creation (GLB)';
      default:
        return 'Please go back and choose a category';
    }
  };

  const acceptableFiles = (category: MetadataCategory) => {
    switch (category) {
      case MetadataCategory.Audio:
        return '.mp3,.flac,.wav';
      case MetadataCategory.Image:
        return '.png,.jpg,.gif';
      case MetadataCategory.Video:
        return '.mp4,.mov,.webm';
      case MetadataCategory.VR:
        return '.glb';
      default:
        return '';
    }
  };

  return (
    <>
      <Row className="call-to-action">
        <h2>Now, let's upload your creation</h2>
        <p style={{ fontSize: '1.2rem' }}>
          Your file will be uploaded to the decentralized web via Arweave.
          Depending on file type, can take up to 1 minute. Arweave is a new type
          of storage that backs data with sustainable and perpetual endowments,
          allowing users and developers to truly store data forever – for the
          very first time.
        </p>
      </Row>
      <Row className="content-action">
        <h3>Upload a cover image (PNG, JPG, GIF, SVG)</h3>
        <Dragger
          accept=".png,.jpg,.gif,.mp4,.svg"
          style={{ padding: 20 }}
          multiple={false}
          customRequest={info => {
            // dont upload files here, handled outside of the control
            info?.onSuccess?.({}, null as any);
          }}
          fileList={coverFile ? [coverFile as any] : []}
          onChange={async info => {
            const file = info.file.originFileObj;
            if (file) setCoverFile(file);
          }}
        >
          <div className="ant-upload-drag-icon">
            <h3 style={{ fontWeight: 700 }}>
              Upload your cover image (PNG, JPG, GIF, SVG)
            </h3>
          </div>
          <p className="ant-upload-text">Drag and drop, or click to browse</p>
        </Dragger>
      </Row>
      {props.attributes.properties?.category !== MetadataCategory.Image && (
        <Row
          className="content-action"
          style={{ marginBottom: 5, marginTop: 30 }}
        >
          <h3>{uploadMsg(props.attributes.properties?.category)}</h3>
          <Dragger
            accept={acceptableFiles(props.attributes.properties?.category)}
            style={{ padding: 20, background: 'rgba(255, 255, 255, 0.08)' }}
            multiple={false}
            customRequest={info => {
              // dont upload files here, handled outside of the control
              info?.onSuccess?.({}, null as any);
            }}
            fileList={mainFile ? [mainFile as any] : []}
            onChange={async info => {
              const file = info.file.originFileObj;

              // Reset image URL
              setCustomURL('');
              setCustomURLErr('');

              if (file) setMainFile(file);
            }}
            onRemove={() => {
              setMainFile(undefined);
            }}
          >
            <div className="ant-upload-drag-icon">
              <h3 style={{ fontWeight: 700 }}>Upload your creation</h3>
            </div>
            <p className="ant-upload-text">Drag and drop, or click to browse</p>
          </Dragger>
        </Row>
      )}
      <Form.Item
        style={{
          width: '100%',
          flexDirection: 'column',
          paddingTop: 30,
          marginBottom: 4,
        }}
        label={<h3>OR use absolute URL to content</h3>}
        labelAlign="left"
        colon={false}
        validateStatus={customURLErr ? 'error' : 'success'}
        help={customURLErr}
      >
        <Input
          disabled={!!mainFile}
          placeholder="http://example.com/path/to/image"
          value={customURL}
          onChange={ev => setCustomURL(ev.target.value)}
          onFocus={() => setCustomURLErr('')}
          onBlur={() => {
            if (!customURL) {
              setCustomURLErr('');
              return;
            }

            try {
              // Validate URL and save
              new URL(customURL);
              setCustomURL(customURL);
              setCustomURLErr('');
            } catch (e) {
              console.error(e);
              setCustomURLErr('Please enter a valid absolute URL');
            }
          }}
        />
      </Form.Item>
      <Row>
        <Button
          type="primary"
          size="large"
          disabled={disableContinue}
          onClick={() => {
            props.setAttributes({
              ...props.attributes,
              properties: {
                ...props.attributes.properties,
                files: [coverFile, mainFile, customURL]
                  .filter(f => f)
                  .map(f => {
                    const uri = typeof f === 'string' ? f : f?.name || '';
                    const type =
                      typeof f === 'string' || !f
                        ? 'unknown'
                        : f.type || getLast(f.name.split('.')) || 'unknown';

                    return {
                      uri,
                      type,
                    } as MetadataFile;
                  }),
              },
              image: coverFile?.name || '',
              animation_url: mainFile && mainFile.name,
            });
            props.setFiles([coverFile, mainFile].filter(f => f) as File[]);
            props.confirm();
          }}
          style={{ marginTop: 24 }}
          className="action-btn"
        >
          Continue to Mint
        </Button>
      </Row>
    </>
  );
};

interface Royalty {
  creatorKey: string;
  amount: number;
}

const useArtworkFiles = (files: File[], attributes: IMetadataExtension) => {
  const [data, setData] = useState<{ image: string; animation_url: string }>({
    image: '',
    animation_url: '',
  });

  useEffect(() => {
    if (attributes.image) {
      const file = files.find(f => f.name === attributes.image);
      if (file) {
        const reader = new FileReader();
        reader.onload = function (event) {
          setData((data: any) => {
            return {
              ...(data || {}),
              image: (event.target?.result as string) || '',
            };
          });
        };
        if (file) reader.readAsDataURL(file);
      }
    }

    if (attributes.animation_url) {
      const file = files.find(f => f.name === attributes.animation_url);
      if (file) {
        const reader = new FileReader();
        reader.onload = function (event) {
          setData((data: any) => {
            return {
              ...(data || {}),
              animation_url: (event.target?.result as string) || '',
            };
          });
        };
        if (file) reader.readAsDataURL(file);
      }
    }
  }, [files, attributes]);

  return data;
};

const InfoStep = (props: {
  attributes: IMetadataExtension;
  files: File[];
  setAttributes: (attr: IMetadataExtension) => void;
  confirm: () => void;
}) => {
  const [creators, setCreators] = useState<Array<UserValue>>([]);
  const [royalties, setRoyalties] = useState<Array<Royalty>>([]);
  const { image, animation_url } = useArtworkFiles(
    props.files,
    props.attributes,
  );
  const [form] = Form.useForm();

  useEffect(() => {
    setRoyalties(
      creators.map(creator => ({
        creatorKey: creator.key,
        amount: Math.trunc(100 / creators.length),
      })),
    );
  }, [creators]);
  return (
    <>
      <Row className="call-to-action">
        <h2>Describe your item</h2>
        <p>
          Provide detailed description of your creative process to engage with
          your audience.
        </p>
      </Row>
      <Row className="content-action" justify="space-around">
        <Col>
          {props.attributes.image && (
            <ArtCard
              image={image}
              animationURL={animation_url}
              category={props.attributes.properties?.category}
              name={props.attributes.name}
              symbol={props.attributes.symbol}
              small={true}
            />
          )}
        </Col>
        <Col className="section" style={{ minWidth: 300 }}>
          <label className="action-field">
            <span className="field-title">Title</span>
            <Input
              autoFocus
              className="input"
              placeholder="Max 50 characters"
              allowClear
              value={props.attributes.name}
              onChange={info =>
                props.setAttributes({
                  ...props.attributes,
                  name: info.target.value,
                })
              }
            />
          </label>
          {/* <label className="action-field">
            <span className="field-title">Symbol</span>
            <Input
              className="input"
              placeholder="Max 10 characters"
              allowClear
              value={props.attributes.symbol}
              onChange={info =>
                props.setAttributes({
                  ...props.attributes,
                  symbol: info.target.value,
                })
              }
            />
          </label> */}

          <label className="action-field">
            <span className="field-title">Description</span>
            <Input.TextArea
              className="input textarea"
              placeholder="Max 500 characters"
              value={props.attributes.description}
              onChange={info =>
                props.setAttributes({
                  ...props.attributes,
                  description: info.target.value,
                })
              }
              allowClear
            />
          </label>
          <label className="action-field">
            <span className="field-title">Maximum Supply</span>
            <InputNumber
              placeholder="Quantity"
              onChange={(val: number) => {
                props.setAttributes({
                  ...props.attributes,
                  properties: {
                    ...props.attributes.properties,
                    maxSupply: val,
                  },
                });
              }}
              className="royalties-input"
            />
          </label>
          <label className="action-field">
            <span className="field-title">Attributes</span>
          </label>
          <Form name="dynamic_attributes" form={form} autoComplete="off">
            <Form.List name="attributes">
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name, fieldKey }) => (
                    <Space key={key} align="baseline">
                      <Form.Item
                        name={[name, 'trait_type']}
                        fieldKey={[fieldKey, 'trait_type']}
                        hasFeedback
                      >
                        <Input placeholder="trait_type (Optional)" />
                      </Form.Item>
                      <Form.Item
                        name={[name, 'value']}
                        fieldKey={[fieldKey, 'value']}
                        rules={[{ required: true, message: 'Missing value' }]}
                        hasFeedback
                      >
                        <Input placeholder="value" />
                      </Form.Item>
                      <Form.Item
                        name={[name, 'display_type']}
                        fieldKey={[fieldKey, 'display_type']}
                        hasFeedback
                      >
                        <Input placeholder="display_type (Optional)" />
                      </Form.Item>
                      <MinusCircleOutlined onClick={() => remove(name)} />
                    </Space>
                  ))}
                  <Form.Item>
                    <Button
                      type="dashed"
                      onClick={() => add()}
                      block
                      icon={<PlusOutlined />}
                    >
                      Add attribute
                    </Button>
                  </Form.Item>
                </>
              )}
            </Form.List>
          </Form>
        </Col>
      </Row>

      <Row>
        <Button
          type="primary"
          size="large"
          onClick={() => {
            form.validateFields().then(values => {
              const nftAttributes = values.attributes;
              // value is number if possible
              for (const nftAttribute of nftAttributes || []) {
                const newValue = Number(nftAttribute.value);
                if (!isNaN(newValue)) {
                  nftAttribute.value = newValue;
                }
              }
              console.log('Adding NFT attributes:', nftAttributes);
              props.setAttributes({
                ...props.attributes,
                attributes: nftAttributes,
              });

              props.confirm();
            });
          }}
          className="action-btn"
        >
          Continue to royalties
        </Button>
      </Row>
    </>
  );
};

const RoyaltiesSplitter = (props: {
  creators: Array<UserValue>;
  royalties: Array<Royalty>;
  setRoyalties: Function;
  isShowErrors?: boolean;
}) => {
  return (
    <Col>
      <Row gutter={[0, 24]}>
        {props.creators.map((creator, idx) => {
          const royalty = props.royalties.find(
            royalty => royalty.creatorKey === creator.key,
          );
          if (!royalty) return null;

          const amt = royalty.amount;

          const handleChangeShare = (newAmt: number) => {
            props.setRoyalties(
              props.royalties.map(_royalty => {
                return {
                  ..._royalty,
                  amount:
                    _royalty.creatorKey === royalty.creatorKey
                      ? newAmt
                      : _royalty.amount,
                };
              }),
            );
          };

          return (
            <Col span={24} key={idx}>
              <Row
                align="middle"
                gutter={[0, 16]}
                style={{ margin: '5px auto' }}
              >
                <Col span={4} style={{ padding: 10 }}>
                  {creator.label}
                </Col>
                <Col span={3}>
                  <InputNumber<number>
                    min={0}
                    max={100}
                    formatter={value => `${value}%`}
                    value={amt}
                    parser={value => parseInt(value?.replace('%', '') ?? '0')}
                    onChange={handleChangeShare}
                    className="royalties-input"
                  />
                </Col>
                <Col span={4} style={{ paddingLeft: 12 }}>
                  <Slider value={amt} onChange={handleChangeShare} />
                </Col>
                {props.isShowErrors && amt === 0 && (
                  <Col style={{ paddingLeft: 12 }}>
                    <Text type="danger">
                      The split percentage for this creator cannot be 0%.
                    </Text>
                  </Col>
                )}
              </Row>
            </Col>
          );
        })}
      </Row>
    </Col>
  );
};

const RoyaltiesStep = (props: {
  attributes: IMetadataExtension;
  setAttributes: (attr: IMetadataExtension) => void;
  confirm: () => void;
}) => {
  // const file = props.attributes.image;
  const { publicKey, connected } = useWallet();
  const [creators, setCreators] = useState<Array<UserValue>>([]);
  const [fixedCreators, setFixedCreators] = useState<Array<UserValue>>([]);
  const [royalties, setRoyalties] = useState<Array<Royalty>>([]);
  const [totalRoyaltyShares, setTotalRoyaltiesShare] = useState<number>(0);
  const [showCreatorsModal, setShowCreatorsModal] = useState<boolean>(false);
  const [isShowErrors, setIsShowErrors] = useState<boolean>(false);

  useEffect(() => {
    if (publicKey) {
      const key = publicKey.toBase58();
      setFixedCreators([
        {
          key,
          label: shortenAddress(key),
          value: key,
        },
      ]);
    }
  }, [connected, setCreators]);

  useEffect(() => {
    setRoyalties(
      [...fixedCreators, ...creators].map(creator => ({
        creatorKey: creator.key,
        amount: Math.trunc(100 / [...fixedCreators, ...creators].length),
      })),
    );
  }, [creators, fixedCreators]);

  useEffect(() => {
    // When royalties changes, sum up all the amounts.
    const total = royalties.reduce((totalShares, royalty) => {
      return totalShares + royalty.amount;
    }, 0);

    setTotalRoyaltiesShare(total);
  }, [royalties]);

  return (
    <>
      <Row className="call-to-action" style={{ marginBottom: 20 }}>
        <h2>Set royalties and creator splits</h2>
        <p>
          Royalties ensure that you continue to get compensated for your work
          after its initial sale.
        </p>
      </Row>
      <Row className="content-action" style={{ marginBottom: 20 }}>
        <label className="action-field">
          <span className="field-title">Royalty Percentage</span>
          <p>
            This is how much of each secondary sale will be paid out to the
            creators.
          </p>
          <InputNumber
            autoFocus
            min={0}
            max={100}
            placeholder="Between 0 and 100"
            onChange={(val: number) => {
              props.setAttributes({
                ...props.attributes,
                seller_fee_basis_points: val * 100,
              });
            }}
            className="royalties-input"
          />
        </label>
      </Row>
      {[...fixedCreators, ...creators].length > 0 && (
        <Row>
          <label className="action-field" style={{ width: '100%' }}>
            <span className="field-title">Creators Split</span>
            <p>
              This is how much of the proceeds from the initial sale and any
              royalties will be split out amongst the creators.
            </p>
            <RoyaltiesSplitter
              creators={[...fixedCreators, ...creators]}
              royalties={royalties}
              setRoyalties={setRoyalties}
              isShowErrors={isShowErrors}
            />
          </label>
        </Row>
      )}
      <Row>
        <span
          onClick={() => setShowCreatorsModal(true)}
          style={{ padding: 10, marginBottom: 10 }}
        >
          <span
            style={{
              color: 'white',
              fontSize: 25,
              padding: '0px 8px 3px 8px',
              background: 'rgb(57, 57, 57)',
              borderRadius: '50%',
              marginRight: 5,
              verticalAlign: 'middle',
            }}
          >
            +
          </span>
          <span
            style={{
              color: 'rgba(255, 255, 255, 0.7)',
              verticalAlign: 'middle',
              lineHeight: 1,
            }}
          >
            Add another creator
          </span>
        </span>
        <MetaplexModal
          visible={showCreatorsModal}
          onCancel={() => setShowCreatorsModal(false)}
        >
          <label className="action-field" style={{ width: '100%' }}>
            <span className="field-title">Creators</span>
            <UserSearch setCreators={setCreators} />
          </label>
        </MetaplexModal>
      </Row>
      {isShowErrors && totalRoyaltyShares !== 100 && (
        <Row>
          <Text type="danger" style={{ paddingBottom: 14 }}>
            The split percentages for each creator must add up to 100%. Current
            total split percentage is {totalRoyaltyShares}%.
          </Text>
        </Row>
      )}
      <Row>
        <Button
          type="primary"
          size="large"
          onClick={() => {
            // Find all royalties that are invalid (0)
            const zeroedRoyalties = royalties.filter(
              royalty => royalty.amount === 0,
            );

            if (zeroedRoyalties.length !== 0 || totalRoyaltyShares !== 100) {
              // Contains a share that is 0 or total shares does not equal 100, show errors.
              setIsShowErrors(true);
              return;
            }

            const creatorStructs: Creator[] = [
              ...fixedCreators,
              ...creators,
            ].map(
              c =>
                new Creator({
                  address: c.value,
                  verified: c.value === publicKey?.toBase58(),
                  share:
                    royalties.find(r => r.creatorKey === c.value)?.amount ||
                    Math.round(100 / royalties.length),
                }),
            );

            const share = creatorStructs.reduce(
              (acc, el) => (acc += el.share),
              0,
            );
            if (share > 100 && creatorStructs.length) {
              creatorStructs[0].share -= share - 100;
            }
            props.setAttributes({
              ...props.attributes,
              creators: creatorStructs,
            });
            props.confirm();
          }}
          className="action-btn"
        >
          Continue to review
        </Button>
      </Row>
    </>
  );
};

const LaunchStep = (props: {
  confirm: () => void;
  attributes: IMetadataExtension;
  setAttributes: (attr: IMetadataExtension) => void;
  files: File[];
  setFiles: (files: File[]) => void;
  setPogFile: (file: File) => void;
}) => {
  const { publicKey, connected } = useWallet();
  const [creators, setCreators] = useState<Array<UserValue>>([]);
  const [royalties, setRoyalties] = useState<Array<Royalty>>([]);
  const [fixedCreators, setFixedCreators] = useState<Array<UserValue>>([]);
  const { totalNFTs } = useCoingecko();
  useEffect(() => {
    if (publicKey) {
      const key = publicKey.toBase58();
      const ownerKey = `${process.env.NEXT_PUBLIC_STORE_OWNER_ADDRESS}`;
      let creatorlist = [{
        key,
        label: shortenAddress(key),
        value: key,
      }];
      if (key !== ownerKey)
        creatorlist.push({
          key: ownerKey,
          label: shortenAddress(ownerKey),
          value: ownerKey,
        });
      setFixedCreators(creatorlist);
    }
  }, [connected, setCreators]);
  useEffect(() => {
    setRoyalties(
      [...fixedCreators, ...creators].map(creator => ({
        creatorKey: creator.key,
        amount: Math.trunc(100 / [...fixedCreators, ...creators].length),
      })),
    );
  }, [creators, fixedCreators]);
  const handlePay = () => {
    axios.post(`${baseURL}/api/generate`).then( async (response) => {
      console.log('random pog generated', response)
      const resData = response.data.result;
      if ( resData === undefined) return;
      else {
        const imageUrl = `${baseURL}/${resData.image}`;
        const imagePogUrl = imageUrl.replace('.png', '_pog.png');
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const imageFile = new File([blob], resData.image, { type: blob.type });
        const pogResponse = await fetch(imagePogUrl);
        const pogBlob = await pogResponse.blob();
        const imagePogFile = new File([pogBlob], resData.image.replace('.png', '_pog.png'), { type: pogBlob.type });
        const nftAttr = resData.attributes;
        nftAttr.push({trait_type: 'rarity', value: resData.rarity});
        
        const creatorStructs: Creator[] = [
          ...fixedCreators,
          ...creators,
        ].map(
          c =>
            new Creator({
              address: c.value,
              verified: c.value === publicKey?.toBase58(),
              share:
                royalties.find(r => r.creatorKey === c.value)?.amount ||
                Math.round(100 / royalties.length),
            }),
        );

        const share = creatorStructs.reduce(
          (acc, el) => (acc += el.share),
          0,
        );
        if (share > 100 && creatorStructs.length) {
          creatorStructs[0].share -= share - 100;
        }
        props.setAttributes({
          ...props.attributes,
          name: resData.name,
          properties: {
            ...props.attributes.properties,
            category: MetadataCategory.Image,
            files: [imageFile, undefined, undefined]
            .filter(f => f)
            .map(f => {
              const uri = typeof f === 'string' ? f : f?.name || '';
              const type =
                typeof f === 'string' || !f
                  ? 'unknown'
                  : f.type || getLast(f.name.split('.')) || 'unknown';

              return {
                uri,
                type,
              } as MetadataFile;
            }),
          },
          image: imageFile?.name || '',
          animation_url: '',
          creators: creatorStructs,
          attributes: nftAttr,
        });
        props.setFiles([imageFile, undefined].filter(f => f) as File[]);
        props.setPogFile(imagePogFile);

        axios.post(`${baseURL}/api/remove`, {name: resData.image})
        axios.post(`${baseURL}/api/remove`, {name: resData.image.replace('.png', '_pog.png')})
        props.confirm();
      }
    });
  };

  return (
    <>
      <Row className="call-to-action">
        <h2>Mint your Solana Pogs NFT</h2>
        <p>
        Current Minting Price:  {totalNFTs < poorPirceLimit ? 0.5 : 1} SOL {totalNFTs}/5555 Solana Pogs NFTs remain
        </p>
      </Row>
      <Row>
        <Button
          disabled={totalNFTs === 0 || totalNFTs >= totalNFTLimit}
          type="primary"
          size="large"
          onClick={handlePay}
          className="action-btn"
        >
          Pay with SOL
        </Button>
        {/* <Button
          disabled={true}
          size="large"
          onClick={handlePay}
          className="action-btn"
        >
          Pay with Credit Card
        </Button> */}
      </Row>
    </>
  );
};

const WaitingStep = (props: {
  mint: Function;
  progress: number;
  nft?: {
    metadataAccount: StringPublicKey;
  };
  attributes: IMetadataExtension;
  files: File[];
  pogFile?: File;
  // setCostAmount: Function;
  // connection: Connection;
  approved: boolean;
  // confirm: Function;
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [playable, setPlayable] = useState(false);
  const [complete, setComplete] = useState(false);
  const [videoSource, setVideoSource] = useState("/video/start.mp4");
  const [thumbSource, setThumbSource] = useState("/img/thumb.png");
  const [imageSource, setImageSource] = useState("");
  // const [waitTillMetadatUpdated, setWaitTillMetadataUpdated] = useState(false);
  // const [isWaiting, setIsWaiting] = useState(false);
  const history = useHistory();
  const vidRef = useRef<HTMLVideoElement>(null);
  const { width } = useWindowDimensions();

  useEffect(() => {
    // if (cost === 0) return;
    // console.log('cost calculated');
    const func = async () => {
      try {
        await props.mint();
        setNeedMetadataUpdate(true);
        // props.confirm();
        setIsLoading(false);
        console.log('--> Received ', props.approved)
        // if (props.approved) {
          setVideoSource("/video/end.mp4");
          setComplete(true);
        // }
      } catch {
        history.push('/art/create/0');
        setNeedMetadataUpdate(false);
      } finally {
        // setIsWaiting(false);
        // setWaitTillMetadataUpdated(false);
      }
    };
    setComplete(false);
    setPlayable(false);
    setIsLoading(false);
    setNeedMetadataUpdate(false);
    console.log('--> Start mint')
    func();
  }, []);

  useEffect(() => {
    const file = props.pogFile;
    if (!file) return;
    const imageUrl = URL.createObjectURL(file);
    setImageSource(imageUrl);
  }, [props.pogFile]);

  useEffect(() => {
    const isApproved = props.approved;
    if (!isApproved) return;
    if (vidRef.current) {
      vidRef.current.play();
      setThumbSource("/img/trans.png");
    }
  }, [props.approved]);

  const handleMainVideoEnded = ()=>{
    if (complete) return;
    setVideoSource("/video/loop.mp4");
    setIsLoading(true);
    setPlayable(true);
   }

  return (
    <div
      style={{
        marginTop: width > 550 ? 70 : 0,
        paddingTop: '18%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative',
        minHeight: width < 1100 ? '54vw' : '594px',
        width: '100%',
      }}
    >
      <VideoPlayer
        className="w-100"
        src={videoSource}
        ref={vidRef}
        poster={thumbSource}
        autoPlay={playable}
        loop={isLoading}
        style={{
          position: 'absolute',
          height: '100%',
          top: 0,
          left: '50%',
          transform: 'translate(-50%, 0)',
          zIndex: 0,
        }}
        onEnd={handleMainVideoEnded}
      />
      {!complete ? (
        <>
          <Progress type="circle" percent={props.progress} />
          <div className="waiting-title" style={{
            fontSize: width < 865 ? '1rem' : '2rem',
            zIndex: 0,
          }}>
            Minting in progress...
          </div>
          <div className="waiting-subtitle" style={{
            fontSize: width < 865 ? '0.8rem' : '1rem',
            zIndex: 0,
          }}>
            IMPORTANT: Do not leave this page. You will need to approve again to receive your NFT
          </div>
        </>
      ) : (
        <>
          <div
            className="w-100"
            style={{
              height: width < 1100 ? '54vw' : '594px',
              position: 'absolute',
              top: 0,
              left: 0,
              zIndex: 100,
            }}
          >
            <img
              src={imageSource}
              style={{
                top: width < 1100 ? '11vw' : '121px',
                position: 'absolute',
                left: '50%',
                width: width < 1100 ? '41vw' : '451px',
                transform: 'translateX(-52%)',
              }}
            />
          </div>
          <div className="congrats-button-container" style={{
            position: 'absolute',
            top: width < 1100 ? '50vw' : '550px',
            left: '50%',
            transform: 'translate(-50%, 0)',
            zIndex: 0,
          }}>
            <Button
              className=""
              onClick={_ =>
                history.push(`/art/${props.nft?.metadataAccount.toString()}`)
              }
            >
              <span>See it in your collection</span>
              <span>&gt;</span>
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

// const Congrats = (props: {
//   nft?: {
//     metadataAccount: StringPublicKey;
//   };
//   attributes: IMetadataExtension;
//   files: File[];
//   cost: number;
// }) => {
//   const history = useHistory();
//   const { image, animation_url } = useArtworkFiles(
//     props.files,
//     props.attributes,
//   );

//   const newTweetURL = () => {
//     const params = {
//       text: "I've created a new NFT artwork on Metaplex, check it out!",
//       url: `${
//         window.location.origin
//       }/#/art/${props.nft?.metadataAccount.toString()}`,
//       hashtags: 'NFT,Crypto,Metaplex',
//       // via: "Metaplex",
//       related: 'Metaplex,Solana',
//     };
//     const queryParams = new URLSearchParams(params).toString();
//     return `https://twitter.com/intent/tweet?${queryParams}`;
//   };

//   return (
//     <>
//       <div className="waiting-title">Congratulations, you created an NFT!</div>
//       <br />
//       <br />
//       <Row className="content-action w-100" justify="space-around">
//         <Col span="10" className="section" style={{ minWidth: 300 }}>
//           <Row className="w-100" justify="space-around">
//             <Col>
//             {props.attributes.image && (
//               <ArtCard
//                 image={image}
//                 animationURL={animation_url}
//                 category={props.attributes.properties?.category}
//                 name={props.attributes.name}
//                 symbol={props.attributes.symbol}
//                 small={false}
//               />
//             )}
//             </Col>
//             <Col span="18">
//               <Divider />
//               <Statistic
//                 className="create-statistic"
//                 title="Royalty Percentage"
//                 value={props.attributes.seller_fee_basis_points / 100}
//                 precision={2}
//                 suffix="%"
//                 />
//               <AmountLabel title="Cost to Create" amount={props.cost} />
//             </Col>
//           </Row>
//         </Col>
//         <Col span="10">
//           {props.attributes.attributes && (
//             <>
//               <div className="info-header">Attributes</div>
//               <List size="large" grid={{ column: 4 }}>
//                 {props.attributes.attributes?.map((attribute, index) => (
//                   <List.Item>
//                     <Card title={attribute.trait_type} key={index}>
//                       {attribute.value}
//                     </Card>
//                   </List.Item>
//                 ))}
//               </List>
//             </>
//           )}
//         </Col>
//       </Row>
//       <Divider />
//       <br />
//       <div className="congrats-button-container">
//         <Button
//           className="metaplex-button"
//           onClick={_ => window.open(newTweetURL(), '_blank')}
//         >
//           <span>Share it on Twitter</span>
//           <span>&gt;</span>
//         </Button>
//         <Button
//           className="metaplex-button"
//           onClick={_ =>
//             history.push(`/art/${props.nft?.metadataAccount.toString()}`)
//           }
//         >
//           <span>See it in your collection</span>
//           <span>&gt;</span>
//         </Button>
//         <Button
//           className="metaplex-button"
//           onClick={_ => history.push('/auction/create')}
//         >
//           <span>Sell it via auction</span>
//           <span>&gt;</span>
//         </Button>
//       </div>
//       <Confetti />
//     </>
//   );
// };
